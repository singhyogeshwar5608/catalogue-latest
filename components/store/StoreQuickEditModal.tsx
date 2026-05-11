'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Loader2, X } from 'lucide-react';
import type { Store } from '@/types';
import {
  updateStore,
  isApiError,
  updateAccountPassword,
  parseApiValidationErrors,
  formatValidationErrorsForDisplay,
  ApiError,
} from '@/src/lib/api';

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  open: boolean;
  store: Store;
  onClose: () => void;
  onSaved: (store: Store) => void;
};

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

export default function StoreQuickEditModal({ open, store, onClose, onSaved }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  /** New image chosen in this session (data URL). `null` = keep existing logo on save. */
  const [logoPendingDataUrl, setLogoPendingDataUrl] = useState<string | null>(null);
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description ?? '');
  const [location, setLocation] = useState(store.location ?? '');
  const [state, setState] = useState(store.state ?? '');
  const [district, setDistrict] = useState(store.district ?? '');
  const [phone, setPhone] = useState(store.phone ?? '');
  const [showPhone, setShowPhone] = useState(store.showPhone !== false);
  const [facebook, setFacebook] = useState(store.socialLinks?.facebook ?? '');
  const [instagram, setInstagram] = useState(store.socialLinks?.instagram ?? '');
  const [youtube, setYoutube] = useState(store.socialLinks?.youtube ?? '');
  const [linkedin, setLinkedin] = useState(store.socialLinks?.linkedin ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(store.name);
    setDescription(store.description ?? '');
    setLocation(store.location ?? '');
    setState(store.state ?? '');
    setDistrict(store.district ?? '');
    setPhone(store.phone ?? '');
    setShowPhone(store.showPhone !== false);
    setFacebook(store.socialLinks?.facebook ?? '');
    setInstagram(store.socialLinks?.instagram ?? '');
    setYoutube(store.socialLinks?.youtube ?? '');
    setLinkedin(store.socialLinks?.linkedin ?? '');
    setLogoPendingDataUrl(null);
    setError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  }, [open, store]);

  const logoPreviewSrc = logoPendingDataUrl ?? store.logo ?? '';

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      setError('Logo must be PNG, JPG or WebP.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('Logo must be 2 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setLogoPendingDataUrl(result);
        setError(null);
      }
    };
    reader.onerror = () => setError('Could not read the image file.');
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError('Please enter your current password to save changes.');
      return;
    }

    setSaving(true);
    try {
      let activeCurrentPassword = currentPassword;

      // 1. If new password is provided, update it first
      if (newPassword.trim()) {
        if (newPassword.length < 8) {
          setError('New password must be at least 8 characters.');
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('New password and confirmation do not match.');
          setSaving(false);
          return;
        }

        await updateAccountPassword({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        });

        // If password update succeeds, the next call (updateStore) must use the NEW password
        activeCurrentPassword = newPassword;
      }

      // 2. Update store details
      const { store: next } = await updateStore({
        id: store.id,
        current_password: activeCurrentPassword,
        ...(logoPendingDataUrl ? { logo: logoPendingDataUrl } : {}),
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        location: location.trim() ? location.trim() : undefined,
        state: emptyToNull(state),
        district: emptyToNull(district),
        phone: phone.trim() ? phone.trim() : null,
        show_phone: showPhone,
        facebook_url: emptyToNull(facebook),
        instagram_url: emptyToNull(instagram),
        youtube_url: emptyToNull(youtube),
        linkedin_url: emptyToNull(linkedin),
      });
      setCurrentPassword(''); // Clear password on success
      setNewPassword('');
      setConfirmPassword('');
      onSaved(next);
    } catch (err) {
      if (err instanceof ApiError && err.payload) {
        const fieldErrors = parseApiValidationErrors(err.payload);
        if (fieldErrors) {
          setError(formatValidationErrorsForDisplay(fieldErrors, 'auth'));
          return;
        }
      }
      setError(
        isApiError(err) ? err.message || 'Could not save changes' : err instanceof Error ? err.message : 'Save failed',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await updateAccountPassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated successfully.');
    } catch (err) {
      if (err instanceof ApiError && err.payload) {
        const fieldErrors = parseApiValidationErrors(err.payload);
        if (fieldErrors) {
          setPasswordError(formatValidationErrorsForDisplay(fieldErrors, 'auth'));
          return;
        }
      }
      setPasswordError(
        isApiError(err) ? err.message || 'Could not update password' : err instanceof Error ? err.message : 'Failed',
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[240] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={(ev) => ev.target === ev.currentTarget && !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="store-quick-edit-title"
        className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
          <h2 id="store-quick-edit-title" className="text-lg font-bold text-gray-900">
            Edit store details
          </h2>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="whitespace-pre-line text-sm text-red-700">{error}</p>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">Store logo</label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-inner">
                  {logoPreviewSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreviewSrc}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No logo</div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                  >
                    <ImagePlus className="h-4 w-4 text-primary" />
                    Change logo
                  </button>
                  {logoPendingDataUrl ? (
                    <button
                      type="button"
                      onClick={() => setLogoPendingDataUrl(null)}
                      className="self-start text-xs font-semibold text-primary hover:underline"
                    >
                      Keep current logo
                    </button>
                  ) : null}
                  <p className="text-[11px] text-gray-500">PNG, JPG or WebP · max 2 MB</p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Store name</label>
              <input
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">About / description</label>
              <textarea
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Address / location</label>
              <input
                value={location}
                onChange={(ev) => setLocation(ev.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Shown on your store page"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">District</label>
                <input
                  value={district}
                  onChange={(ev) => setDistrict(ev.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">State</label>
                <input
                  value={state}
                  onChange={(ev) => setState(ev.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Phone</label>
                <input
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Email
                </label>
                <input
                  type="email"
                  readOnly
                  value={store.email ?? ''}
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                  title="Business email matches your login and cannot be changed here"
                  aria-readonly="true"
                />
                <p className="mt-1 text-[11px] text-gray-500">Tied to your account — cannot be edited from this screen.</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Login password</p>
              {passwordSuccess ? (
                <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  {passwordSuccess}
                </p>
              ) : null}
              {passwordError ? (
                <p className="mb-3 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              ) : null}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Current password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(ev) => setCurrentPassword(ev.target.value)}
                    disabled={passwordSaving || saving}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    New password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(ev) => setNewPassword(ev.target.value)}
                    disabled={passwordSaving || saving}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(ev) => setConfirmPassword(ev.target.value)}
                    disabled={passwordSaving || saving}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showPhone}
                onChange={(ev) => setShowPhone(ev.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Show phone on storefront
            </label>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Social links</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={facebook}
                onChange={(ev) => setFacebook(ev.target.value)}
                placeholder="Facebook URL"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={instagram}
                onChange={(ev) => setInstagram(ev.target.value)}
                placeholder="Instagram URL"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={youtube}
                onChange={(ev) => setYoutube(ev.target.value)}
                placeholder="YouTube URL"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={linkedin}
                onChange={(ev) => setLinkedin(ev.target.value)}
                placeholder="LinkedIn URL"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => !saving && onClose()}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
