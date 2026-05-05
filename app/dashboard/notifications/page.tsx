'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CreditCard, Eye, Heart, Loader2, Package, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import {
  deleteFollowNotification,
  deleteStoreNotification,
  getMyFollowNotifications,
  getMyStoreNotifications,
  markFollowNotificationRead,
  markStoreNotificationRead,
} from '@/src/lib/api';
import type { CombinedNotificationItem } from '@/src/lib/combinedNotifications';
import { mergeNotifications } from '@/src/lib/combinedNotifications';

/** Near real-time refresh while this tab is visible (WebSockets can be added later). */
const POLL_MS = 2500;

function iconForItem(item: CombinedNotificationItem) {
  if (item.source === 'follower') {
    if (item.notification.type === 'followed_store_product') return Package;
    return Bell;
  }
  switch (item.notification.type) {
    case 'follow':
      return UserPlus;
    case 'like':
      return Heart;
    case 'seen':
      return Eye;
    case 'subscription':
      return CreditCard;
    default:
      return Bell;
  }
}

function iconWrapClass(item: CombinedNotificationItem): string {
  if (item.source === 'follower' && item.notification.type === 'followed_store_product') {
    return 'bg-teal-100 text-teal-700';
  }
  const t = item.source === 'owner' ? item.notification.type : '';
  if (t === 'like') return 'bg-rose-100 text-rose-600';
  if (t === 'follow') return 'bg-sky-100 text-sky-600';
  if (t === 'seen') return 'bg-violet-100 text-violet-600';
  if (t === 'subscription') return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-600';
}

function lineTitle(item: CombinedNotificationItem): string {
  if (item.source === 'follower') {
    return (item.notification.title || 'Update').trim();
  }
  return (item.notification.title || 'Notification').trim();
}

function lineBody(item: CombinedNotificationItem): string | null {
  const b = item.notification.body;
  if (typeof b === 'string' && b.trim() !== '') return b.trim();
  return null;
}

function formatWhen(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardNotificationsPage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CombinedNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabVisible = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const [owner, follower] = await Promise.all([
        getMyStoreNotifications({ limit: 80 }),
        getMyFollowNotifications({ limit: 80 }),
      ]);
      setItems(mergeNotifications(owner.notifications, follower.notifications));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace('/auth?redirect=/dashboard/notifications');
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    const onVis = () => {
      tabVisible.current = document.visibilityState === 'visible';
      if (tabVisible.current) {
        void fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isLoggedIn || authLoading) return undefined;
    void fetchNotifications();
    const id = window.setInterval(() => {
      if (tabVisible.current) {
        void fetchNotifications();
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoggedIn, authLoading, fetchNotifications]);

  const handleOpen = async (row: CombinedNotificationItem) => {
    const n = row.notification;
    if (n.read_at) return;
    try {
      if (row.source === 'owner') {
        await markStoreNotificationRead(n.id);
      } else {
        await markFollowNotificationRead(n.id);
      }
      const ts = new Date().toISOString();
      setItems((prev) =>
        prev.map((x): CombinedNotificationItem => {
          if (x.source !== row.source || x.notification.id !== n.id) return x;
          if (x.source === 'owner') {
            return { source: 'owner', notification: { ...x.notification, read_at: ts } };
          }
          return { source: 'follower', notification: { ...x.notification, read_at: ts } };
        })
      );
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (row: CombinedNotificationItem) => {
    const n = row.notification;
    try {
      if (row.source === 'owner') {
        await deleteStoreNotification(n.id);
      } else {
        await deleteFollowNotification(n.id);
      }
      setItems((prev) => prev.filter((item) => !(item.source === row.source && item.notification.id === n.id)));
    } catch {
      // ignore
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div>
      <h1 className="sr-only">Notifications</h1>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <p className="text-gray-600">
            No notifications yet. Activity on your store and new listings from stores you follow will appear here.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <ul className="space-y-1.5 sm:space-y-2">
          {items.map((row) => {
            const n = row.notification;
            const Icon = iconForItem(row);
            const isUnread = !n.read_at;
            const productId =
              row.source === 'follower' && typeof n.meta?.product_id === 'number' ? n.meta.product_id : null;
            return (
              <li key={`${row.source}-${n.id}`}>
                <div
                  onClick={() => void handleOpen(row)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition hover:bg-gray-50 sm:gap-3 sm:px-4 sm:py-2.5 ${
                    isUnread ? 'border-primary/30 bg-primary/[0.04]' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${iconWrapClass(row)}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[11px] font-semibold text-gray-900">{lineTitle(row)}</span>
                      {lineBody(row) ? (
                        <span className="min-w-0 truncate text-[10px] text-gray-600">{lineBody(row)}</span>
                      ) : null}
                      {productId != null ? (
                        <Link
                          href={`/product/${productId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 inline-block w-fit text-[10px] font-semibold text-primary hover:underline"
                        >
                          View product
                        </Link>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
                        {isUnread ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="New notification" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {isUnread ? (
                      <span className="hidden rounded-full bg-primary px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white sm:inline-flex">
                        New
                      </span>
                    ) : null}
                    <span className="text-[9px] text-gray-400">{formatWhen(n.created_at)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(row);
                      }}
                      className="inline-flex items-center rounded-md border border-rose-200 px-1.5 py-1 text-[8px] font-semibold text-rose-600 transition hover:bg-rose-50 sm:px-2"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
