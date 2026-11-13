import { Check, Copy, Download, ExternalLink, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AudienceResolution, PrivacyMode, StatusDraft } from '../types';
import {
  buildWhatsAppDirectLink,
  formatPrivacyChecklistText,
} from '../utils/audience';
import { downloadStatusCardPng, renderStatusCardBlob } from '../utils/statusCanvas';
import { STATUS_PRESET_IMAGES } from '../data/seed';

interface ShareSheetModalProps {
  open: boolean;
  onClose: () => void;
  draft: StatusDraft;
  resolution: AudienceResolution;
  privacyMode: PrivacyMode;
  justPublished?: boolean;
}

export function ShareSheetModal({
  open,
  onClose,
  draft,
  resolution,
  privacyMode,
  justPublished = false,
}: ShareSheetModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setShareFeedback(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const messageText =
    draft.format === 'photo' ? draft.caption.trim() : draft.text.trim();
  const preset = STATUS_PRESET_IMAGES.find((p) => p.id === draft.imagePresetId);
  const checklistText = formatPrivacyChecklistText(resolution, privacyMode);

  const handleCopyList = async () => {
    try {
      await navigator.clipboard.writeText(checklistText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareFeedback('Clipboard access unavailable in this browser.');
    }
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    setShareFeedback(null);
    try {
      await downloadStatusCardPng(
        {
          format: draft.format,
          text: draft.text,
          caption: draft.caption,
          bgColorHex: draft.bgColorHex,
          fontStyle: draft.fontStyle,
          imageUrl: draft.imageUrl,
          cropZoom: preset?.cropZoom,
        },
        `whatsapp-status-${Date.now()}.png`
      );
      setShareFeedback('9:16 status image downloaded. Ready to post to WhatsApp Status.');
    } catch {
      setShareFeedback('Unable to export image. Try selecting a different backdrop.');
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    setShareFeedback(null);
    if (typeof navigator === 'undefined' || !navigator.share) {
      setShareFeedback(
        'Direct Web Share is supported on mobile browsers. Download the 9:16 PNG or use the WhatsApp links below.'
      );
      return;
    }

    try {
      const blob = await renderStatusCardBlob({
        format: draft.format,
        text: draft.text,
        caption: draft.caption,
        bgColorHex: draft.bgColorHex,
        fontStyle: draft.fontStyle,
        imageUrl: draft.imageUrl,
        cropZoom: preset?.cropZoom,
      });
      const file = new File([blob], 'whatsapp-status.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'WhatsApp Status Update',
          text: messageText || undefined,
          files: [file],
        });
      } else {
        await navigator.share({
          title: 'WhatsApp Status Update',
          text: messageText,
        });
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setShareFeedback('Share cancelled or unavailable on this device.');
      }
    }
  };

  const privacyInstructions =
    privacyMode === 'only-selected'
      ? `Open WhatsApp → Updates → Status privacy → Select "Only share with..." and check the ${resolution.included.length} contacts listed below.`
      : privacyMode === 'all-except'
        ? `Open WhatsApp → Updates → Status privacy → Select "My contacts except..." and exclude the ${resolution.excluded.length} contacts in ${resolution.selectedGroups.map((g) => g.name).join(', ') || 'selected groups'}.`
        : 'Open WhatsApp → Updates → Status privacy → Select "My contacts".';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-sheet-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="share-sheet-title" className="text-lg font-semibold text-slate-900">
              {justPublished ? 'Status Logged & Ready for WhatsApp' : 'Share Status to Group'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {resolution.whatsappPrivacySetting} · {resolution.included.length} recipients ·{' '}
              {resolution.excluded.length} hidden
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Privacy Checklist Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-700">
              Step 1 — Set WhatsApp Status Privacy
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{privacyInstructions}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyList}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>Copied List</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>Copy Privacy List</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{downloading ? 'Rendering PNG...' : 'Download 9:16 Status PNG'}</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                <Share2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Share Sheet</span>
              </button>
            </div>
            {shareFeedback && (
              <p className="text-xs text-teal-800 font-medium pt-1">{shareFeedback}</p>
            )}
          </div>

          {/* Direct WhatsApp Links for Group Recipients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Step 2 — Recipients in Selected Audience ({resolution.included.length})
              </h3>
              <span className="text-xs text-slate-500">
                Open direct chat in WhatsApp
              </span>
            </div>

            {resolution.included.length === 0 ? (
              <div className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">
                No contacts match the current group selection.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {resolution.included.map((contact) => {
                  const waUrl = buildWhatsAppDirectLink(
                    contact.phone,
                    messageText || 'Shared a new WhatsApp status update with you!'
                  );
                  return (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between gap-4 px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {contact.name}
                        </div>
                        <div className="font-mono text-xs text-slate-500 tabular-nums">
                          {contact.phone}
                        </div>
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50 hover:border-teal-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Send via WhatsApp</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
