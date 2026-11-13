export type PrivacyMode = 'only-selected' | 'all-except' | 'all-contacts';

export type StatusFormat = 'text' | 'photo';

export type StatusFontStyle = 'sans' | 'serif' | 'mono';

export type ActiveTab = 'studio' | 'templates' | 'groups' | 'contacts' | 'history';

export type TemplateCategory =
  | 'Birthdays'
  | 'Holidays'
  | 'Greetings'
  | 'Family'
  | 'Work';

export interface StatusTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  message: string;
  suggestedGroupNames: string[];
  bgColorHex: string;
  fontStyle: StatusFontStyle;
}

export type BackdropArtStyle =
  | 'illustration'
  | 'atmospheric'
  | 'botanical'
  | 'festive';

export interface GeneratedBackdrop {
  id: string;
  title: string;
  prompt: string;
  style: BackdropArtStyle;
  imageUrl: string;
  bgColorHex: string;
  createdAt: number;
}

export type ScheduleMode = 'now' | 'later';

export type RecordLifecycleStatus = 'scheduled' | 'published';

export interface ContactGroup {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  defaultPrivacy: 'include' | 'exclude';
  createdAt: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  initials: string;
  groupIds: string[];
  notes?: string;
  createdAt: number;
}

export interface StatusDraft {
  format: StatusFormat;
  text: string;
  caption: string;
  bgColorHex: string;
  fontStyle: StatusFontStyle;
  imageUrl: string | null;
  imagePresetId: string | null;
  privacyMode: PrivacyMode;
  selectedGroupIds: string[];
  scheduleMode: ScheduleMode;
  scheduleDate: string;
  scheduleTime: string;
}

export interface SharedStatusRecord {
  id: string;
  status: RecordLifecycleStatus;
  format: StatusFormat;
  text: string;
  caption: string;
  bgColorHex: string;
  fontStyle: StatusFontStyle;
  imageUrl: string | null;
  imagePresetId: string | null;
  privacyMode: PrivacyMode;
  groupIds: string[];
  groupNames: string[];
  recipientIds: string[];
  recipientCount: number;
  excludedCount: number;
  createdAt: number;
  scheduledFor?: number;
  sharedAt: number;
  expiresAt: number;
}

export interface AudienceResolution {
  included: Contact[];
  excluded: Contact[];
  selectedGroups: ContactGroup[];
  whatsappPrivacySetting: string;
  summaryText: string;
}

export interface StatusPresetImage {
  id: string;
  label: string;
  url: string;
  suggestedGroupName: string;
  cropZoom?: boolean;
}

export interface StatusPalette {
  id: string;
  name: string;
  hex: string;
}

export interface AppPersistedState {
  contacts: Contact[];
  groups: ContactGroup[];
  history: SharedStatusRecord[];
  draft: StatusDraft;
}
