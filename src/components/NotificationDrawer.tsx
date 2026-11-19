import React, { useState } from 'react';
import { Bell, CheckCheck, X, ArrowUpRight } from 'lucide-react';
import type { EngagementNotification, StaffMember } from '../types/audit';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: StaffMember;
  notifications: EngagementNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onSelectEngagement: (engagementId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkAsRead,
  onMarkAllRead,
  onSelectEngagement,
}) => {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  if (!isOpen) return null;

  const myNotifications = notifications.filter((n) =>
    n.recipient_ids.includes(currentUser.id)
  );
  const displayed = scope === 'mine' ? myNotifications : notifications;

  const unreadCount = myNotifications.filter(
    (n) => !n.read_by.includes(currentUser.id)
  ).length;

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-MY', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const eventTypeLabel = (event: EngagementNotification['trigger_event']) => {
    switch (event) {
      case 'SUBMITTED_TO_MANAGER':
        return 'PIC Submission';
      case 'RETURNED_BY_MANAGER':
        return 'Returned by Manager';
      case 'APPROVED_BY_MANAGER':
        return '1st-Level Approved';
      case 'RETURNED_BY_PARTNER':
        return 'Returned by Partner';
      case 'APPROVED_BY_PARTNER':
        return '2nd-Level Approved';
      case 'EXTENSION_UPDATED':
        return 'Extension Recorded';
    }
  };

  const eventTextColor = (event: EngagementNotification['trigger_event']) => {
    switch (event) {
      case 'APPROVED_BY_PARTNER':
        return 'text-emerald-700';
      case 'APPROVED_BY_MANAGER':
        return 'text-sky-700';
      case 'RETURNED_BY_MANAGER':
      case 'RETURNED_BY_PARTNER':
        return 'text-red-700';
      default:
        return 'text-amber-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[1px]">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Notification Center
            </h2>
            <p className="text-xs text-slate-500">
              Signed in as {currentUser.name} · {unreadCount} unread
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope Toggle + Mark All Read */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-2.5">
          <div className="flex items-center gap-1 rounded-md bg-slate-200/70 p-0.5">
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                scope === 'mine'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              For Me ({myNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Trail ({notifications.length})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E3A5F] hover:underline whitespace-nowrap"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 divide-y divide-slate-200 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Bell className="mb-3 h-7 w-7 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Workflow alerts will appear here when engagements are submitted, returned, or approved.
              </p>
            </div>
          ) : (
            displayed.map((item) => {
              const isForMe = item.recipient_ids.includes(currentUser.id);
              const isUnread = isForMe && !item.read_by.includes(currentUser.id);

              return (
                <div
                  key={item.id}
                  className={`px-6 py-4 transition-colors ${
                    isUnread ? 'bg-slate-50/90' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${eventTextColor(item.trigger_event)}`}>
                      {eventTypeLabel(item.trigger_event)}
                      {isUnread ? ' · Unread' : ''}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {item.message}
                  </p>

                  {item.details.length > 0 && (
                    <dl className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 text-xs">
                      {item.details.map((d, idx) => (
                        <div key={idx} className="flex items-baseline justify-between gap-3">
                          <dt className="text-slate-500 shrink-0">{d.label}</dt>
                          <dd className="font-mono text-right text-slate-800 tabular-nums">
                            {d.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                    <span className="truncate text-slate-500">
                      To: {item.recipient_labels.join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnread) onMarkAsRead(item.id);
                        onSelectEngagement(item.engagement_id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 font-medium text-[#1E3A5F] hover:underline whitespace-nowrap shrink-0"
                    >
                      Open Job
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
