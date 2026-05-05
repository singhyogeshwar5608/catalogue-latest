'use client';

import { useEffect, type CSSProperties } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

type StoreBannerPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  /** Resolved banner URL when available */
  imageSrc: string | undefined;
  /** Shown in modal when there is no image (category gradient) */
  fallbackStyle?: CSSProperties;
  storeName: string;
};

export function StoreBannerPreviewModal({
  open,
  onClose,
  imageSrc,
  fallbackStyle,
  storeName,
}: StoreBannerPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const hasImage = Boolean(imageSrc);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/15"
        role="dialog"
        aria-modal="true"
        aria-label={`${storeName} banner`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 rounded-full bg-black/65 p-2 text-white transition hover:bg-black/85 sm:right-3 sm:top-3"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {hasImage ? (
          <div className="relative flex min-h-[200px] w-full items-center justify-center p-3 sm:p-5">
            <div className="relative h-[min(85vh,80vw)] w-full max-h-[88vh] min-h-[180px]">
              <Image
                src={imageSrc!}
                alt={`${storeName} — store banner`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>
        ) : (
          <div
            className="min-h-[280px] w-full sm:min-h-[360px]"
            style={fallbackStyle}
          />
        )}
      </div>
    </div>
  );
}
