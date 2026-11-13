import { CalendarClock, CheckCircle2, Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ContactsView } from './components/ContactsView';
import { GroupsView } from './components/GroupsView';
import { HistoryView } from './components/HistoryView';
import { ShareSheetModal } from './components/ShareSheetModal';
import { Sidebar } from './components/Sidebar';
import { StatusStudio } from './components/StatusStudio';
import { TemplatesView } from './components/TemplatesView';
import { STATUS_TEMPLATES } from './data/templates';
import type {
  ActiveTab,
  AppPersistedState,
  BackdropArtStyle,
  Contact,
  ContactGroup,
  GeneratedBackdrop,
  SharedStatusRecord,
  StatusDraft,
  StatusTemplate,
  TemplateCategory,
} from './types';
import {
  getDefaultScheduleInputs,
  getInitials,
  isStatusActive,
  processDueScheduledStatuses,
  resolveAudience,
} from './utils/audience';
import {
  loadPersistedState,
  resetPersistedState,
  savePersistedState,
} from './utils/storage';

const DAY_MS = 24 * 3600 * 1000;

function inferArtStyleFromCategory(category: TemplateCategory): BackdropArtStyle {
  if (category === 'Birthdays' || category === 'Holidays') return 'festive';
  if (category === 'Family') return 'botanical';
  if (category === 'Work') return 'atmospheric';
  return 'illustration';
}

export default function App() {
  const [state, setState] = useState<AppPersistedState>(() => loadPersistedState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AI Background Generation state
  const [generatedBackdrops, setGeneratedBackdrops] = useState<GeneratedBackdrop[]>([]);
  const [isGeneratingBackdrop, setIsGeneratingBackdrop] = useState(false);
  const [backdropError, setBackdropError] = useState<string | null>(null);
  const [activeTemplateContext, setActiveTemplateContext] = useState<{
    title: string;
    category: TemplateCategory;
  } | null>(null);

  // Share Sheet modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalJustPublished, setShareModalJustPublished] = useState(false);
  const [shareModalDraft, setShareModalDraft] = useState<StatusDraft | null>(null);
  const [shareModalRecord, setShareModalRecord] =
    useState<SharedStatusRecord | null>(null);

  // Toast / banner for scheduled auto-post or user actions
  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    record?: SharedStatusRecord;
  } | null>(null);

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  useEffect(() => {
    const checkDue = () => {
      const now = Date.now();
      setState((prev) => {
        const { updated, newlyPublished } = processDueScheduledStatuses(
          prev.history,
          now
        );
        if (newlyPublished.length === 0) return prev;
        const first = newlyPublished[0];
        setBannerMessage({
          text: `Scheduled status auto-posted to ${
            first.groupNames.join(', ') || 'your selected audience'
          }.`,
          record: first,
        });
        return { ...prev, history: updated };
      });
    };

    checkDue();
    const timer = window.setInterval(checkDue, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const draftResolution = useMemo(
    () =>
      resolveAudience(
        state.contacts,
        state.groups,
        state.draft.privacyMode,
        state.draft.selectedGroupIds
      ),
    [
      state.contacts,
      state.groups,
      state.draft.privacyMode,
      state.draft.selectedGroupIds,
    ]
  );

  const shareResolution = useMemo(() => {
    if (shareModalRecord) {
      return resolveAudience(
        state.contacts,
        state.groups,
        shareModalRecord.privacyMode,
        shareModalRecord.groupIds
      );
    }
    return draftResolution;
  }, [shareModalRecord, state.contacts, state.groups, draftResolution]);

  const scheduledCount = useMemo(
    () => state.history.filter((h) => h.status === 'scheduled').length,
    [state.history]
  );

  const activeStatusCount = useMemo(() => {
    const now = Date.now();
    return state.history.filter((h) => isStatusActive(h, now)).length;
  }, [state.history]);

  const updateDraft = (patch: Partial<StatusDraft>) => {
    setState((prev) => ({
      ...prev,
      draft: { ...prev.draft, ...patch },
    }));
  };

  const handleGenerateBackdrop = async (options: {
    userPrompt?: string;
    themeTitle?: string;
    category?: string;
    statusText?: string;
    style: BackdropArtStyle;
  }) => {
    setBackdropError(null);
    setIsGeneratingBackdrop(true);
    try {
      const response = await fetch('/api/ai/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: options.userPrompt,
          themeTitle: options.themeTitle ?? activeTemplateContext?.title,
          category: options.category ?? activeTemplateContext?.category,
          statusText: options.statusText ?? (state.draft.text || state.draft.caption),
          style: options.style,
        }),
      });

      const payload = (await response.json()) as {
        title?: string;
        imageUrl?: string;
        bgColorHex?: string;
        style?: BackdropArtStyle;
        error?: string;
      };

      if (!response.ok || !payload.imageUrl) {
        setBackdropError(
          payload.error || 'Could not generate AI status background. Please try again.'
        );
        return;
      }

      const generated: GeneratedBackdrop = {
        id: `ai-bg-${Date.now()}`,
        title: payload.title || 'AI Status Artwork',
        prompt:
          options.userPrompt?.trim() ||
          options.themeTitle ||
          state.draft.text.slice(0, 60),
        style: payload.style || options.style,
        imageUrl: payload.imageUrl,
        bgColorHex: payload.bgColorHex || state.draft.bgColorHex,
        createdAt: Date.now(),
      };

      setGeneratedBackdrops((prev) => [generated, ...prev].slice(0, 8));
      updateDraft({
        imageUrl: generated.imageUrl,
        imagePresetId: null,
        bgColorHex: generated.bgColorHex,
      });
    } catch {
      setBackdropError(
        'Network error while contacting the AI background service.'
      );
    } finally {
      setIsGeneratingBackdrop(false);
    }
  };

  const handlePublishOrSchedule = (scheduledFor?: number) => {
    const now = Date.now();
    const isScheduled = typeof scheduledFor === 'number';
    const record: SharedStatusRecord = {
      id: `sts-${now}`,
      status: isScheduled ? 'scheduled' : 'published',
      format: state.draft.format,
      text: state.draft.text.trim(),
      caption: state.draft.caption.trim(),
      bgColorHex: state.draft.bgColorHex,
      fontStyle: state.draft.fontStyle,
      imageUrl: state.draft.imageUrl,
      imagePresetId: state.draft.imagePresetId,
      privacyMode: state.draft.privacyMode,
      groupIds: [...state.draft.selectedGroupIds],
      groupNames: draftResolution.selectedGroups.map((g) => g.name),
      recipientIds: draftResolution.included.map((c) => c.id),
      recipientCount: draftResolution.included.length,
      excludedCount: draftResolution.excluded.length,
      createdAt: now,
      scheduledFor: isScheduled ? scheduledFor : undefined,
      sharedAt: isScheduled ? scheduledFor : now,
      expiresAt: (isScheduled ? scheduledFor : now) + DAY_MS,
    };

    setState((prev) => ({
      ...prev,
      history: [record, ...prev.history],
    }));

    if (isScheduled) {
      setBannerMessage({
        text: `Status scheduled for ${record.groupNames.join(', ') || 'selected audience'}.`,
      });
      setActiveTab('history');
    } else {
      setShareModalDraft(state.draft);
      setShareModalRecord(record);
      setShareModalJustPublished(true);
      setShareModalOpen(true);
    }
  };

  const handleApplyTemplate = (
    template: StatusTemplate,
    options: {
      applySuggestedGroups: boolean;
      openSchedule: boolean;
      generateAiBackdrop?: boolean;
    }
  ) => {
    const matchedGroupIds = options.applySuggestedGroups
      ? state.groups
          .filter((g) =>
            template.suggestedGroupNames.some(
              (name) => name.toLowerCase() === g.name.toLowerCase()
            )
          )
          .map((g) => g.id)
      : state.draft.selectedGroupIds;

    const defaults = getDefaultScheduleInputs();
    setActiveTemplateContext({
      title: template.title,
      category: template.category,
    });
    updateDraft({
      format: 'text',
      text: template.message,
      bgColorHex: template.bgColorHex,
      fontStyle: template.fontStyle,
      imageUrl: null,
      imagePresetId: null,
      privacyMode: 'only-selected',
      selectedGroupIds:
        matchedGroupIds.length > 0 ? matchedGroupIds : state.draft.selectedGroupIds,
      scheduleMode: options.openSchedule ? 'later' : 'now',
      scheduleDate: state.draft.scheduleDate || defaults.date,
      scheduleTime: state.draft.scheduleTime || defaults.time,
    });
    setActiveTab('studio');

    if (options.generateAiBackdrop) {
      void handleGenerateBackdrop({
        themeTitle: template.title,
        category: template.category,
        statusText: template.message,
        style: inferArtStyleFromCategory(template.category),
      });
    }
  };

  const handleCreateGroup = (
    groupInput: Omit<ContactGroup, 'id' | 'createdAt'>,
    memberIds: string[]
  ) => {
    const newId = `grp-${Date.now()}`;
    const newGroup: ContactGroup = {
      ...groupInput,
      id: newId,
      createdAt: Date.now(),
    };
    const memberSet = new Set(memberIds);

    setState((prev) => ({
      ...prev,
      groups: [...prev.groups, newGroup],
      contacts: prev.contacts.map((c) =>
        memberSet.has(c.id) ? { ...c, groupIds: [...c.groupIds, newId] } : c
      ),
    }));
  };

  const handleUpdateGroup = (
    groupId: string,
    patch: Partial<Omit<ContactGroup, 'id' | 'createdAt'>>,
    memberIds?: string[]
  ) => {
    const memberSet = memberIds ? new Set(memberIds) : null;
    setState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
      contacts: memberSet
        ? prev.contacts.map((c) => {
            const hasGroup = c.groupIds.includes(groupId);
            const shouldHave = memberSet.has(c.id);
            if (hasGroup === shouldHave) return c;
            return {
              ...c,
              groupIds: shouldHave
                ? [...c.groupIds, groupId]
                : c.groupIds.filter((id) => id !== groupId),
            };
          })
        : prev.contacts,
    }));
  };

  const handleDeleteGroup = (groupId: string) => {
    setState((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
      contacts: prev.contacts.map((c) => ({
        ...c,
        groupIds: c.groupIds.filter((id) => id !== groupId),
      })),
      draft: {
        ...prev.draft,
        selectedGroupIds: prev.draft.selectedGroupIds.filter((id) => id !== groupId),
      },
    }));
  };

  const handleComposeForGroup = (group: ContactGroup) => {
    updateDraft({
      privacyMode: group.defaultPrivacy === 'exclude' ? 'all-except' : 'only-selected',
      selectedGroupIds: [group.id],
    });
    setActiveTab('studio');
  };

  const handleAddContact = (input: {
    name: string;
    phone: string;
    notes?: string;
    groupIds: string[];
  }) => {
    const newContact: Contact = {
      id: `cnt-${Date.now()}`,
      name: input.name,
      phone: input.phone,
      initials: getInitials(input.name),
      groupIds: input.groupIds,
      notes: input.notes,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      contacts: [newContact, ...prev.contacts],
    }));
  };

  const handleUpdateContact = (
    contactId: string,
    patch: { name: string; phone: string; notes?: string; groupIds: string[] }
  ) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) =>
        c.id === contactId
          ? {
              ...c,
              name: patch.name,
              phone: patch.phone,
              initials: getInitials(patch.name),
              notes: patch.notes,
              groupIds: patch.groupIds,
            }
          : c
      ),
    }));
  };

  const handleToggleContactGroup = (contactId: string, groupId: string) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => {
        if (c.id !== contactId) return c;
        const exists = c.groupIds.includes(groupId);
        return {
          ...c,
          groupIds: exists
            ? c.groupIds.filter((id) => id !== groupId)
            : [...c.groupIds, groupId],
        };
      }),
    }));
  };

  const handleDeleteContact = (contactId: string) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== contactId),
    }));
  };

  const handleBulkImportContacts = (
    entries: Array<{ name: string; phone: string }>,
    groupIds: string[]
  ) => {
    const base = Date.now();
    const imported: Contact[] = entries.map((entry, idx) => ({
      id: `cnt-${base}-${idx}`,
      name: entry.name,
      phone: entry.phone,
      initials: getInitials(entry.name),
      groupIds: [...groupIds],
      createdAt: base + idx,
    }));
    setState((prev) => ({
      ...prev,
      contacts: [...imported, ...prev.contacts],
    }));
    setBannerMessage({
      text: `Imported ${imported.length} contacts into directory.`,
    });
  };

  const handlePostScheduledNow = (recordId: string) => {
    const target = state.history.find((item) => item.id === recordId);
    if (!target) return;

    const now = Date.now();
    const postedRecord: SharedStatusRecord = {
      ...target,
      status: 'published',
      sharedAt: now,
      expiresAt: now + DAY_MS,
    };

    setState((prev) => ({
      ...prev,
      history: prev.history.map((item) =>
        item.id === recordId ? postedRecord : item
      ),
    }));

    setShareModalDraft({
      ...state.draft,
      format: postedRecord.format,
      text: postedRecord.text,
      caption: postedRecord.caption,
      bgColorHex: postedRecord.bgColorHex,
      fontStyle: postedRecord.fontStyle,
      imageUrl: postedRecord.imageUrl,
      imagePresetId: postedRecord.imagePresetId,
      privacyMode: postedRecord.privacyMode,
      selectedGroupIds: postedRecord.groupIds,
    });
    setShareModalRecord(postedRecord);
    setShareModalJustPublished(true);
    setShareModalOpen(true);
  };

  const handleReuseRecord = (record: SharedStatusRecord) => {
    updateDraft({
      format: record.format,
      text: record.text,
      caption: record.caption,
      bgColorHex: record.bgColorHex,
      fontStyle: record.fontStyle,
      imageUrl: record.imageUrl,
      imagePresetId: record.imagePresetId,
      privacyMode: record.privacyMode,
      selectedGroupIds: record.groupIds.filter((id) =>
        state.groups.some((g) => g.id === id)
      ),
      scheduleMode: 'now',
    });
    setActiveTab('studio');
  };

  const handleShareRecord = (record: SharedStatusRecord) => {
    setShareModalDraft({
      ...state.draft,
      format: record.format,
      text: record.text,
      caption: record.caption,
      bgColorHex: record.bgColorHex,
      fontStyle: record.fontStyle,
      imageUrl: record.imageUrl,
      imagePresetId: record.imagePresetId,
      privacyMode: record.privacyMode,
      selectedGroupIds: record.groupIds,
    });
    setShareModalRecord(record);
    setShareModalJustPublished(false);
    setShareModalOpen(true);
  };

  const handleDeleteRecord = (recordId: string) => {
    setState((prev) => ({
      ...prev,
      history: prev.history.filter((h) => h.id !== recordId),
    }));
  };

  const handleResetDemoData = () => {
    const fresh = resetPersistedState();
    setState(fresh);
    setGeneratedBackdrops([]);
    setBackdropError(null);
    setActiveTemplateContext(null);
    setBannerMessage({ text: 'Sample contacts, groups, and status history restored.' });
  };

  const pageMeta: Record<ActiveTab, { title: string; ctaLabel: string; ctaAction: () => void }> = {
    studio: {
      title: 'Status Studio',
      ctaLabel: 'Browse Templates',
      ctaAction: () => setActiveTab('templates'),
    },
    templates: {
      title: 'Template Library',
      ctaLabel: 'Open Status Studio',
      ctaAction: () => setActiveTab('studio'),
    },
    groups: {
      title: 'Contact Groups',
      ctaLabel: 'Open Status Studio',
      ctaAction: () => setActiveTab('studio'),
    },
    contacts: {
      title: 'Contacts Directory',
      ctaLabel: 'Manage Groups',
      ctaAction: () => setActiveTab('groups'),
    },
    history: {
      title: 'Schedule & History',
      ctaLabel: 'Compose Status',
      ctaAction: () => setActiveTab('studio'),
    },
  };

  const currentMeta = pageMeta[activeTab];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        templateCount={STATUS_TEMPLATES.length}
        groupCount={state.groups.length}
        contactCount={state.contacts.length}
        scheduledCount={scheduledCount}
        activeStatusCount={activeStatusCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenMobile={() => setMobileMenuOpen(true)}
        onResetDemoData={handleResetDemoData}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 lg:px-8 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-400 whitespace-nowrap min-w-0">
              <span className="hidden sm:inline font-medium text-slate-500">
                CircleStatus
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
                {currentMeta.title}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={currentMeta.ctaAction}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {currentMeta.ctaLabel}
          </button>
        </header>

        <main className="flex-1 px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          {bannerMessage && (
            <div
              role="status"
              className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 text-sm font-medium text-teal-900">
                {bannerMessage.record ? (
                  <CalendarClock className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" aria-hidden="true" />
                )}
                <span>{bannerMessage.text}</span>
              </div>
              <div className="flex items-center gap-2">
                {bannerMessage.record && (
                  <button
                    type="button"
                    onClick={() => {
                      if (bannerMessage.record) {
                        handleShareRecord(bannerMessage.record);
                      }
                    }}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                  >
                    Open WhatsApp Share
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBannerMessage(null)}
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-teal-700 hover:bg-teal-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'studio' && (
            <StatusStudio
              draft={state.draft}
              onUpdateDraft={updateDraft}
              groups={state.groups}
              contacts={state.contacts}
              resolution={draftResolution}
              onPublishStatus={handlePublishOrSchedule}
              onNavigateToGroups={() => setActiveTab('groups')}
              onNavigateToTemplates={() => setActiveTab('templates')}
              generatedBackdrops={generatedBackdrops}
              isGeneratingBackdrop={isGeneratingBackdrop}
              backdropError={backdropError}
              onClearBackdropError={() => setBackdropError(null)}
              onGenerateBackdrop={(opts) => {
                void handleGenerateBackdrop(opts);
              }}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesView
              groups={state.groups}
              selectedGroupIds={state.draft.selectedGroupIds}
              onApplyTemplate={handleApplyTemplate}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              groups={state.groups}
              contacts={state.contacts}
              onCreateGroup={handleCreateGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onComposeForGroup={handleComposeForGroup}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsView
              contacts={state.contacts}
              groups={state.groups}
              onAddContact={handleAddContact}
              onUpdateContact={handleUpdateContact}
              onToggleContactGroup={handleToggleContactGroup}
              onDeleteContact={handleDeleteContact}
              onBulkImportContacts={handleBulkImportContacts}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              history={state.history}
              onReuseRecord={handleReuseRecord}
              onShareRecord={handleShareRecord}
              onPostScheduledNow={handlePostScheduledNow}
              onDeleteRecord={handleDeleteRecord}
              onNavigateToStudio={() => setActiveTab('studio')}
            />
          )}
        </main>
      </div>

      <ShareSheetModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        draft={shareModalDraft ?? state.draft}
        resolution={shareResolution}
        privacyMode={
          shareModalRecord?.privacyMode ?? state.draft.privacyMode
        }
        justPublished={shareModalJustPublished}
      />
    </div>
  );
}
