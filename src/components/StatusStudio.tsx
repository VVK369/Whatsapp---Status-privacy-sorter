import {
  BookText,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Send,
  Type,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  QUICK_TEMPLATES,
  STATUS_PALETTES,
  STATUS_PRESET_IMAGES,
} from '../data/seed';
import type {
  AudienceResolution,
  BackdropArtStyle,
  Contact,
  ContactGroup,
  GeneratedBackdrop,
  PrivacyMode,
  ScheduleMode,
  StatusDraft,
  StatusFontStyle,
} from '../types';
import {
  formatPrivacyChecklistText,
  formatScheduledDateTime,
  validateScheduledTime,
} from '../utils/audience';
import { downloadStatusCardPng } from '../utils/statusCanvas';

interface StatusStudioProps {
  draft: StatusDraft;
  onUpdateDraft: (patch: Partial<StatusDraft>) => void;
  groups: ContactGroup[];
  contacts: Contact[];
  resolution: AudienceResolution;
  onPublishStatus: (scheduledFor?: number) => void;
  onNavigateToGroups: () => void;
  onNavigateToTemplates: () => void;
  generatedBackdrops: GeneratedBackdrop[];
  isGeneratingBackdrop: boolean;
  backdropError: string | null;
  onClearBackdropError: () => void;
  onGenerateBackdrop: (options: {
    userPrompt?: string;
    style: BackdropArtStyle;
  }) => void;
}

const ART_STYLES: Array<{ id: BackdropArtStyle; label: string }> = [
  { id: 'illustration', label: 'Illustration' },
  { id: 'atmospheric', label: 'Atmospheric' },
  { id: 'botanical', label: 'Botanical' },
  { id: 'festive', label: 'Festive' },
];

export function StatusStudio({
  draft,
  onUpdateDraft,
  groups,
  contacts,
  resolution,
  onPublishStatus,
  onNavigateToGroups,
  onNavigateToTemplates,
  generatedBackdrops,
  isGeneratingBackdrop,
  backdropError,
  onClearBackdropError,
  onGenerateBackdrop,
}: StatusStudioProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedPrivacy, setCopiedPrivacy] = useState(false);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiStyle, setAiStyle] = useState<BackdropArtStyle>('illustration');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedPreset = STATUS_PRESET_IMAGES.find(
    (p) => p.id === draft.imagePresetId
  );

  const groupMemberCounts = new Map<string, number>();
  for (const group of groups) {
    groupMemberCounts.set(
      group.id,
      contacts.filter((c) => c.groupIds.includes(group.id)).length
    );
  }

  const toggleGroupSelection = (groupId: string) => {
    setValidationError(null);
    const exists = draft.selectedGroupIds.includes(groupId);
    const nextIds = exists
      ? draft.selectedGroupIds.filter((id) => id !== groupId)
      : [...draft.selectedGroupIds, groupId];
    onUpdateDraft({ selectedGroupIds: nextIds });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageLoadError(false);
        setValidationError(null);
        onUpdateDraft({
          format: 'photo',
          imageUrl: reader.result,
          imagePresetId: null,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitStatus = () => {
    if (draft.format === 'text' && !draft.text.trim()) {
      setValidationError('Enter a status message before submitting.');
      return;
    }
    if (draft.format === 'photo' && !draft.imageUrl) {
      setValidationError(
        'Choose a photo preset, generate an AI backdrop, or upload an image before submitting.'
      );
      return;
    }
    if (
      draft.privacyMode === 'only-selected' &&
      draft.selectedGroupIds.length === 0
    ) {
      setValidationError('Select at least one contact group for "Only share with".');
      return;
    }
    if (resolution.included.length === 0) {
      setValidationError(
        'Your current group filter resolves to 0 contacts. Add contacts or adjust groups.'
      );
      return;
    }

    if (draft.scheduleMode === 'later') {
      const scheduleCheck = validateScheduledTime(
        draft.scheduleDate,
        draft.scheduleTime
      );
      if (!scheduleCheck.valid || !scheduleCheck.scheduledFor) {
        setValidationError(
          scheduleCheck.error ?? 'Select a valid future date and time.'
        );
        return;
      }
      setValidationError(null);
      onPublishStatus(scheduleCheck.scheduledFor);
      return;
    }

    setValidationError(null);
    onPublishStatus(undefined);
  };

  const handleCopyPrivacy = async () => {
    try {
      const checklist = formatPrivacyChecklistText(resolution, draft.privacyMode);
      await navigator.clipboard.writeText(checklist);
      setCopiedPrivacy(true);
      setTimeout(() => setCopiedPrivacy(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadCard = async () => {
    if (draft.format === 'text' && !draft.text.trim()) {
      setValidationError('Enter a status message to export as an image.');
      return;
    }
    if (draft.format === 'photo' && !draft.imageUrl) {
      setValidationError('Choose or upload a photo to export.');
      return;
    }
    setDownloading(true);
    setValidationError(null);
    try {
      await downloadStatusCardPng({
        format: draft.format,
        text: draft.text,
        caption: draft.caption,
        bgColorHex: draft.bgColorHex,
        fontStyle: draft.fontStyle,
        imageUrl: draft.imageUrl,
        cropZoom: selectedPreset?.cropZoom,
      });
    } finally {
      setDownloading(false);
    }
  };

  const previewFontClass =
    draft.fontStyle === 'serif'
      ? 'font-serif'
      : draft.fontStyle === 'mono'
        ? 'font-mono'
        : 'font-display';

  const audienceHeadline =
    draft.privacyMode === 'all-contacts'
      ? `All contacts (${resolution.included.length})`
      : draft.privacyMode === 'only-selected'
        ? resolution.selectedGroups.length > 0
          ? `Only ${resolution.selectedGroups.map((g) => g.name).join(', ')}`
          : 'No groups selected'
        : resolution.selectedGroups.length > 0
          ? `All except ${resolution.selectedGroups.map((g) => g.name).join(', ')}`
          : `All contacts (${resolution.included.length})`;

  const schedulePreviewCheck =
    draft.scheduleMode === 'later'
      ? validateScheduledTime(draft.scheduleDate, draft.scheduleTime)
      : null;

  const aiStudioPanel = (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <Wand2 className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
          <span>AI Background & Illustration Generator</span>
        </div>
        {draft.format === 'text' && draft.imageUrl && (
          <button
            type="button"
            onClick={() =>
              onUpdateDraft({ imageUrl: null, imagePresetId: null })
            }
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            <span>Use Solid Color</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={aiPromptInput}
          onChange={(e) => {
            onClearBackdropError();
            setAiPromptInput(e.target.value);
          }}
          placeholder="Describe background art (or leave blank to match message theme)..."
          aria-label="AI background prompt"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
        />
        <button
          type="button"
          disabled={isGeneratingBackdrop}
          onClick={() => {
            setImageLoadError(false);
            onGenerateBackdrop({
              userPrompt: aiPromptInput,
              style: aiStyle,
            });
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
        >
          {isGeneratingBackdrop ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Generate AI Art</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-slate-500 mr-1">Style:</span>
        {ART_STYLES.map((st) => {
          const active = aiStyle === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setAiStyle(st.id)}
              aria-pressed={active}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-teal-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {st.label}
            </button>
          );
        })}
      </div>

      {backdropError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {backdropError}
        </div>
      )}

      {generatedBackdrops.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <div className="text-[11px] font-medium text-slate-500">
            Generated Backgrounds ({generatedBackdrops.length})
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {generatedBackdrops.map((item) => {
              const active = draft.imageUrl === item.imageUrl;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setImageLoadError(false);
                    onUpdateDraft({
                      imageUrl: item.imageUrl,
                      imagePresetId: null,
                      bgColorHex: item.bgColorHex,
                    });
                  }}
                  aria-label={`Apply AI artwork ${item.title}`}
                  aria-pressed={active}
                  className={`group shrink-0 w-16 rounded-md border overflow-hidden text-left transition-colors ${
                    active
                      ? 'border-teal-700 ring-2 ring-teal-700/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="aspect-[9/16] w-full bg-slate-200 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      {/* Left Column: Composer, Audience Grouping, Scheduling */}
      <div className="xl:col-span-7 space-y-6">
        {/* 1. Status Content Card */}
        <section
          aria-labelledby="composer-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2
                id="composer-heading"
                className="text-base font-semibold text-slate-900"
              >
                1. Compose Status Update
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Create a text card or photo update for 9:16 WhatsApp Status.
              </p>
            </div>

            <div
              role="group"
              aria-label="Status format"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0 self-start"
            >
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  onUpdateDraft({ format: 'text' });
                }}
                aria-pressed={draft.format === 'text'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  draft.format === 'text'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Type className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Text Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  onUpdateDraft({
                    format: 'photo',
                    imageUrl: draft.imageUrl ?? STATUS_PRESET_IMAGES[0].url,
                    imagePresetId: draft.imagePresetId ?? STATUS_PRESET_IMAGES[0].id,
                  });
                }}
                aria-pressed={draft.format === 'photo'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  draft.format === 'photo'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Photo Status</span>
              </button>
            </div>
          </div>

          {draft.format === 'text' ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="status-text-input"
                    className="text-xs font-medium text-slate-700"
                  >
                    Status Message
                  </label>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {draft.text.length}/700
                  </span>
                </div>
                <textarea
                  id="status-text-input"
                  rows={4}
                  maxLength={700}
                  value={draft.text}
                  onChange={(e) => {
                    setValidationError(null);
                    onUpdateDraft({ text: e.target.value });
                  }}
                  placeholder="Write your WhatsApp status update..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-700">Backdrop Color</div>
                  <div className="flex items-center gap-2">
                    {STATUS_PALETTES.map((palette) => {
                      const active =
                        !draft.imageUrl && draft.bgColorHex === palette.hex;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() =>
                            onUpdateDraft({
                              bgColorHex: palette.hex,
                              imageUrl: null,
                              imagePresetId: null,
                            })
                          }
                          aria-label={`Select backdrop color ${palette.name}`}
                          aria-pressed={active}
                          style={{ backgroundColor: palette.hex }}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform ${
                            active
                              ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                              : 'hover:scale-105'
                          }`}
                        >
                          {active && (
                            <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-700">Typography</div>
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    {(
                      [
                        { id: 'sans', label: 'Sans' },
                        { id: 'serif', label: 'Serif' },
                        { id: 'mono', label: 'Mono' },
                      ] as Array<{ id: StatusFontStyle; label: string }>
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdateDraft({ fontStyle: opt.id })}
                        aria-pressed={draft.fontStyle === opt.id}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          draft.fontStyle === opt.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {aiStudioPanel}

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">Quick starters:</span>
                  {QUICK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        const groupExists = groups.some((g) => g.id === tpl.groupId);
                        onUpdateDraft({
                          format: 'text',
                          text: tpl.text,
                          bgColorHex: tpl.bgColorHex,
                          privacyMode: 'only-selected',
                          selectedGroupIds: groupExists
                            ? [tpl.groupId]
                            : draft.selectedGroupIds,
                        });
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onNavigateToTemplates}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline whitespace-nowrap"
                >
                  <BookText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>All Templates</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {aiStudioPanel}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">
                    Or Choose Photo Backdrop / Upload
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Upload Image</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Upload status photo"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {STATUS_PRESET_IMAGES.map((preset) => {
                    const active = draft.imagePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setImageLoadError(false);
                          setValidationError(null);
                          onUpdateDraft({
                            imageUrl: preset.url,
                            imagePresetId: preset.id,
                          });
                        }}
                        aria-pressed={active}
                        className={`group text-left rounded-lg border overflow-hidden transition-colors ${
                          active
                            ? 'border-teal-700 ring-2 ring-teal-700/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            referrerPolicy="no-referrer"
                            className={`h-full w-full object-cover ${
                              preset.cropZoom ? 'scale-125' : ''
                            }`}
                          />
                        </div>
                        <div className="px-2.5 py-2 bg-white">
                          <div className="text-xs font-medium text-slate-800 truncate">
                            {preset.label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {preset.suggestedGroupName}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="status-caption-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Photo Caption (Optional)
                </label>
                <input
                  id="status-caption-input"
                  type="text"
                  maxLength={240}
                  value={draft.caption}
                  onChange={(e) => onUpdateDraft({ caption: e.target.value })}
                  placeholder="Add a caption to overlay at the bottom..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            </div>
          )}
        </section>

        {/* 2. Audience & Contact Groups Selector */}
        <section
          aria-labelledby="audience-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h2
                id="audience-heading"
                className="text-base font-semibold text-slate-900"
              >
                2. Target Contact Groups
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Select circles to include or exclude. Overlapping contacts are deduplicated.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToGroups}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline whitespace-nowrap shrink-0 self-start pt-0.5"
            >
              Manage Groups
            </button>
          </div>

          <div
            role="group"
            aria-label="WhatsApp status privacy rule"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            {(
              [
                {
                  id: 'only-selected',
                  title: 'Only share with',
                  subtitle: 'Show only to picked groups',
                },
                {
                  id: 'all-except',
                  title: 'My contacts except',
                  subtitle: 'Hide from picked groups',
                },
                {
                  id: 'all-contacts',
                  title: 'All contacts',
                  subtitle: 'Everyone in directory',
                },
              ] as Array<{ id: PrivacyMode; title: string; subtitle: string }>
            ).map((mode) => {
              const active = draft.privacyMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    onUpdateDraft({ privacyMode: mode.id });
                  }}
                  aria-pressed={active}
                  className={`text-left rounded-lg border px-3.5 py-2.5 transition-colors ${
                    active
                      ? 'border-teal-700 bg-teal-50/70 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{mode.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{mode.subtitle}</div>
                </button>
              );
            })}
          </div>

          {draft.privacyMode !== 'all-contacts' && (
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-slate-700">
                {draft.privacyMode === 'only-selected'
                  ? 'Select Groups to Include'
                  : 'Select Groups to Exclude'}
              </div>
              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No contact groups defined yet.{' '}
                  <button
                    type="button"
                    onClick={onNavigateToGroups}
                    className="font-medium text-teal-700 underline"
                  >
                    Create your first group
                  </button>
                  .
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {groups.map((group) => {
                    const selected = draft.selectedGroupIds.includes(group.id);
                    const memberCount = groupMemberCounts.get(group.id) ?? 0;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => toggleGroupSelection(group.id)}
                        aria-pressed={selected}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                          selected
                            ? draft.privacyMode === 'all-except'
                              ? 'border-amber-600 bg-amber-50/70'
                              : 'border-teal-700 bg-teal-50/70'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-3 w-3 rounded-xs shrink-0"
                            style={{ backgroundColor: group.colorHex }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {group.name}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {memberCount} {memberCount === 1 ? 'contact' : 'contacts'}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                            selected
                              ? draft.privacyMode === 'all-except'
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-teal-700 bg-teal-700 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <Users className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
                <span className="font-semibold tabular-nums">
                  {resolution.included.length} of {contacts.length} contacts
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">
                  {resolution.excluded.length} hidden
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowRecipientPreview((prev) => !prev)}
                aria-expanded={showRecipientPreview}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                <span>
                  {showRecipientPreview ? 'Hide recipients' : 'Inspect recipients'}
                </span>
                {showRecipientPreview ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            {showRecipientPreview && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    Will See Status ({resolution.included.length})
                  </div>
                  {resolution.included.length === 0 ? (
                    <div className="text-slate-400">None</div>
                  ) : (
                    <div className="text-slate-600 leading-relaxed">
                      {resolution.included.map((c) => c.name).join(', ')}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    Hidden From ({resolution.excluded.length})
                  </div>
                  {resolution.excluded.length === 0 ? (
                    <div className="text-slate-400">None</div>
                  ) : (
                    <div className="text-slate-500 leading-relaxed">
                      {resolution.excluded.map((c) => c.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Delivery & Scheduling Section */}
        <section
          aria-labelledby="schedule-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2
                id="schedule-heading"
                className="text-base font-semibold text-slate-900"
              >
                3. Delivery Timing
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Share immediately or queue your status to auto-post at a specific date and time.
              </p>
            </div>

            <div
              role="group"
              aria-label="Delivery timing"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0 self-start"
            >
              {(
                [
                  { id: 'now', label: 'Post Now' },
                  { id: 'later', label: 'Schedule' },
                ] as Array<{ id: ScheduleMode; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setValidationError(null);
                    onUpdateDraft({ scheduleMode: opt.id });
                  }}
                  aria-pressed={draft.scheduleMode === opt.id}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    draft.scheduleMode === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.id === 'later' && (
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {draft.scheduleMode === 'later' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label
                  htmlFor="schedule-date-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Schedule Date
                </label>
                <input
                  id="schedule-date-input"
                  type="date"
                  value={draft.scheduleDate}
                  onChange={(e) => {
                    setValidationError(null);
                    onUpdateDraft({ scheduleDate: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
              <div>
                <label
                  htmlFor="schedule-time-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Schedule Time
                </label>
                <input
                  id="schedule-time-input"
                  type="time"
                  value={draft.scheduleTime}
                  onChange={(e) => {
                    setValidationError(null);
                    onUpdateDraft({ scheduleTime: e.target.value });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
              <div className="sm:col-span-2 text-xs text-slate-500">
                {schedulePreviewCheck?.valid && schedulePreviewCheck.scheduledFor
                  ? `Queued for automatic posting on ${formatScheduledDateTime(
                      schedulePreviewCheck.scheduledFor
                    )}.`
                  : schedulePreviewCheck?.error || 'Pick a future date and time.'}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Right Column: Live 9:16 Preview & Publish Actions */}
      <div className="xl:col-span-5 xl:sticky xl:top-20 space-y-4">
        <section
          aria-label="Live WhatsApp status preview"
          className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col items-center space-y-5"
        >
          <div className="w-full flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Live 9:16 Status Preview
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {resolution.whatsappPrivacySetting}
            </span>
          </div>

          <div className="w-full max-w-[300px] aspect-[9/16] rounded-[28px] border-[6px] border-slate-900 bg-slate-900 overflow-hidden relative shadow-md flex flex-col justify-between">
            {draft.imageUrl && !imageLoadError ? (
              <>
                <img
                  src={draft.imageUrl}
                  alt="WhatsApp status backdrop preview"
                  referrerPolicy="no-referrer"
                  onError={() => setImageLoadError(true)}
                  className={`absolute inset-0 h-full w-full object-cover ${
                    selectedPreset?.cropZoom ? 'scale-125' : ''
                  }`}
                />
                {draft.format === 'text' && (
                  <div className="absolute inset-0 bg-slate-950/25" aria-hidden="true" />
                )}
              </>
            ) : (
              <div
                className="absolute inset-0 transition-colors duration-200"
                style={{ backgroundColor: draft.bgColorHex }}
              />
            )}

            <div className="relative z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-4 pt-3 pb-6 space-y-2.5">
              <div className="flex gap-1">
                <div className="h-0.5 flex-1 rounded-full bg-white/95" />
                <div className="h-0.5 flex-1 rounded-full bg-white/35" />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xs font-semibold text-white">
                  ME
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    My Status
                  </div>
                  <div className="text-[11px] text-white/80 truncate">
                    {draft.scheduleMode === 'later' &&
                    schedulePreviewCheck?.scheduledFor
                      ? formatScheduledDateTime(schedulePreviewCheck.scheduledFor)
                      : 'Just now'}{' '}
                    · {audienceHeadline}
                  </div>
                </div>
              </div>
            </div>

            {draft.format === 'text' && (
              <div className="relative z-10 px-6 my-auto text-center">
                <p
                  className={`${previewFontClass} text-white text-lg leading-relaxed font-semibold break-words text-balance drop-shadow-xs`}
                >
                  {draft.text.trim() || 'Your status text will appear here...'}
                </p>
              </div>
            )}

            <div className="relative z-10 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-5 pt-10 text-center">
              {draft.format === 'photo' && draft.caption.trim() ? (
                <p className="text-xs sm:text-sm text-white font-medium leading-snug mb-3">
                  {draft.caption}
                </p>
              ) : null}
              <div className="text-[11px] text-white/85 tabular-nums">
                Visible to {resolution.included.length}{' '}
                {resolution.included.length === 1 ? 'contact' : 'contacts'}
              </div>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="w-full rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {validationError}
            </div>
          )}

          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={handleSubmitStatus}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              {draft.scheduleMode === 'later' ? (
                <>
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  <span>Schedule Status Update</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Publish & Share to Audience</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadCard}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{downloading ? 'Exporting...' : 'Download PNG'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPrivacy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                {copiedPrivacy ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                    <span>Copied List</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy Privacy List</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
