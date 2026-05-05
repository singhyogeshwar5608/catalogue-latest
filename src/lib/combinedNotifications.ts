import type { StoreOwnerNotification, UserFollowNotification } from '@/src/lib/api';

export type CombinedNotificationItem =
  | { source: 'owner'; notification: StoreOwnerNotification }
  | { source: 'follower'; notification: UserFollowNotification };

export function mergeNotifications(
  owner: StoreOwnerNotification[],
  follower: UserFollowNotification[]
): CombinedNotificationItem[] {
  const o = owner.map((notification) => ({ source: 'owner' as const, notification }));
  const f = follower.map((notification) => ({ source: 'follower' as const, notification }));
  return [...o, ...f].sort((a, b) => {
    const ta = new Date(a.notification.created_at ?? 0).getTime();
    const tb = new Date(b.notification.created_at ?? 0).getTime();
    return tb - ta;
  });
}
