import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { NOTIFICATION_POLL_INTERVAL_MS, ONE_MINUTE_MS } from '../../lib/constants';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  NEW_LEAD: '👤',
  EVENT_REMINDER: '📅',
  CAMPAIGN_SENT: '📣',
  PAYMENT_RECEIVED: '💳',
  BOOKING_CREATED: '📝',
  BOOKING_STATUS: '🔄',
  EXPENSE: '💰',
  SYSTEM: '⚙️',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / ONE_MINUTE_MS);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  return `منذ ${months} شهر`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications?limit=10'),
        api.get('/notifications/unread-count'),
      ]);
      setItems(listRes.data.data.items ?? []);
      setUnread(countRes.data.data.count ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, NOTIFICATION_POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchAll]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) fetchAll();
  };

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await api.post('/notifications/mark-all-read');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label="الإشعارات"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">الإشعارات</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary-600 transition hover:bg-primary-50 disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              تحديد الكل كمقروء
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-400">لا توجد إشعارات</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-start transition hover:bg-slate-50',
                    !n.isRead && 'bg-primary-50/40',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg">
                    {typeIcons[n.type] || '🔔'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-slate-800">{n.title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-500">{n.message}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
