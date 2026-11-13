import { CalendarClock, Clock, RotateCcw, Send, Share2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SharedStatusRecord } from '../types';
import {
  formatRelativeTime,
  formatRemainingWindow,
  formatScheduledDateTime,
  isStatusActive,
} from '../utils/audience';

interface HistoryViewProps {
  history: SharedStatusRecord[];
  onReuseRecord: (record: SharedStatusRecord) => void;
  onShareRecord: (record: SharedStatusRecord) => void;
  onPostScheduledNow: (recordId: string) => void;
  onDeleteRecord: (recordId: string) => void;
  onNavigateToStudio: () => void;
}

type HistoryFilter = 'all' | 'scheduled' | 'active' | 'expired';

export function HistoryView({
  history,
  onReuseRecord,
  onShareRecord,
  onPostScheduledNow,
  onDeleteRecord,
  onNavigateToStudio,
}: HistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const now = Date.now();

  const counts = useMemo(() => {
    let scheduled = 0;
    let active = 0;
    let expired = 0;
    for (const item of history) {
      if (item.status === 'scheduled') scheduled += 1;
      else if (isStatusActive(item, now)) active += 1;
      else expired += 1;
    }
    return { all: history.length, scheduled, active, expired };
  }, [history, now]);

  const filteredRecords = useMemo(() => {
    return history.filter((item) => {
      if (filter === 'scheduled') return item.status === 'scheduled';
      if (filter === 'active') return isStatusActive(item, now);
      if (filter === 'expired')
        return item.status === 'published' && !isStatusActive(item, now);
      return true;
    });
  }, [filter, history, now]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Scheduled Queue & 24h Status History
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {counts.scheduled} scheduled · {counts.active} active · {counts.expired} expired
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter status history"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'scheduled', label: `Scheduled (${counts.scheduled})` },
              { id: 'active', label: `Active (${counts.active})` },
              { id: 'expired', label: `Expired (${counts.expired})` },
            ] as Array<{ id: HistoryFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              aria-pressed={filter === tab.id}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <Clock className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <div className="text-sm font-medium text-slate-900">
            No status updates in this view
          </div>
          <p className="text-xs text-slate-500">
            Compose or schedule a targeted WhatsApp status in Status Studio.
          </p>
          <button
            type="button"
            onClick={onNavigateToStudio}
            className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Open Status Studio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const isScheduled = record.status === 'scheduled';
            const active = isStatusActive(record, now);
            const displayText =
              record.format === 'photo'
                ? record.caption || 'Photo status update'
                : record.text;

            const privacyLabel =
              record.privacyMode === 'only-selected'
                ? `Only ${record.groupNames.join(', ') || 'selected'}`
                : record.privacyMode === 'all-except'
                  ? `All except ${record.groupNames.join(', ') || 'none'}`
                  : 'All contacts';

            return (
              <article
                key={record.id}
                className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  {/* Small Thumbnail / Color Swatch */}
                  <div
                    className="h-16 w-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: record.bgColorHex }}
                  >
                    {record.format === 'photo' && record.imageUrl ? (
                      <img
                        src={record.imageUrl}
                        alt="Status thumbnail"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-white/90 px-1 text-center leading-tight">
                        TXT
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="text-xs text-slate-500 tabular-nums">
                      {isScheduled ? (
                        <span className="font-semibold text-amber-700">
                          Scheduled for{' '}
                          {record.scheduledFor
                            ? formatScheduledDateTime(record.scheduledFor)
                            : 'later'}
                        </span>
                      ) : active ? (
                        <span className="font-semibold text-teal-700">
                          Active · {formatRemainingWindow(record.expiresAt, now)}
                        </span>
                      ) : (
                        <span className="text-slate-500">Expired</span>
                      )}
                      <span aria-hidden="true"> · </span>
                      <span>{privacyLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{record.recipientCount} recipients</span>
                      {!isScheduled && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{formatRelativeTime(record.sharedAt, now)}</span>
                        </>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900 line-clamp-2">
                      {displayText}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isScheduled ? (
                    <button
                      type="button"
                      onClick={() => onPostScheduledNow(record.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Post Now</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onShareRecord(record)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Share</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onReuseRecord(record)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reuse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteRecord(record.id)}
                    aria-label={
                      isScheduled
                        ? `Cancel scheduled status ${displayText.slice(0, 24)}`
                        : `Delete status ${displayText.slice(0, 24)}`
                    }
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {counts.scheduled > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 flex items-center gap-3 text-xs text-slate-600">
          <CalendarClock className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
          <span>
            Automatic scheduler checks due statuses while CircleStatus is open and notifies you immediately to complete WhatsApp sharing.
          </span>
        </div>
      )}
    </div>
  );
}
