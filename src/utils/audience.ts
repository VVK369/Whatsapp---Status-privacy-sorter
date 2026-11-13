import type {
  AudienceResolution,
  Contact,
  ContactGroup,
  PrivacyMode,
  SharedStatusRecord,
} from '../types';

const DAY_MS = 24 * 3600 * 1000;

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length >= 7 && digits.length <= 15;
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function validateContactInput(
  name: string,
  phone: string
): { valid: boolean; errors: { name?: string; phone?: string } } {
  const errors: { name?: string; phone?: string } = {};
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  if (!trimmedName) {
    errors.name = 'Contact name is required.';
  } else if (trimmedName.length < 2) {
    errors.name = 'Contact name must be at least 2 characters.';
  }

  if (!trimmedPhone) {
    errors.phone = 'WhatsApp phone number is required.';
  } else if (!isValidPhone(trimmedPhone)) {
    errors.phone = 'Enter a valid phone number with 7 to 15 digits.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateGroupInput(
  name: string,
  existingGroups: ContactGroup[],
  ignoreId?: string
): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Group name is required.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Group name must be at least 2 characters.' };
  }
  if (trimmed.length > 36) {
    return { valid: false, error: 'Group name must be 36 characters or fewer.' };
  }
  const duplicate = existingGroups.some(
    (g) => g.id !== ignoreId && g.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { valid: false, error: `A group named "${trimmed}" already exists.` };
  }
  return { valid: true };
}

export function resolveAudience(
  contacts: Contact[],
  groups: ContactGroup[],
  privacyMode: PrivacyMode,
  selectedGroupIds: string[]
): AudienceResolution {
  const selectedIdSet = new Set(selectedGroupIds);
  const selectedGroups = groups.filter((g) => selectedIdSet.has(g.id));

  if (privacyMode === 'all-contacts') {
    return {
      included: [...contacts],
      excluded: [],
      selectedGroups: [],
      whatsappPrivacySetting: 'My contacts',
      summaryText: `Visible to all ${contacts.length} contacts`,
    };
  }

  const included: Contact[] = [];
  const excluded: Contact[] = [];

  for (const contact of contacts) {
    const matchesAnySelectedGroup = contact.groupIds.some((gid) => selectedIdSet.has(gid));

    if (privacyMode === 'only-selected') {
      if (matchesAnySelectedGroup) {
        included.push(contact);
      } else {
        excluded.push(contact);
      }
    } else {
      if (matchesAnySelectedGroup) {
        excluded.push(contact);
      } else {
        included.push(contact);
      }
    }
  }

  if (privacyMode === 'only-selected') {
    const groupLabel =
      selectedGroups.length === 0
        ? 'no groups selected'
        : selectedGroups.map((g) => g.name).join(', ');
    return {
      included,
      excluded,
      selectedGroups,
      whatsappPrivacySetting: 'Only share with...',
      summaryText:
        selectedGroups.length === 0
          ? 'Select at least one group to include recipients'
          : `${included.length} of ${contacts.length} contacts (${groupLabel})`,
    };
  }

  const excludedLabel =
    selectedGroups.length === 0
      ? 'none excluded'
      : selectedGroups.map((g) => g.name).join(', ');

  return {
    included,
    excluded,
    selectedGroups,
    whatsappPrivacySetting: 'My contacts except...',
    summaryText:
      selectedGroups.length === 0
        ? `Visible to all ${contacts.length} contacts (0 excluded)`
        : `${included.length} visible · ${excluded.length} hidden (${excludedLabel})`,
  };
}

export function buildWhatsAppDirectLink(phone: string, text: string): string {
  const digits = normalizePhone(phone);
  const encodedText = encodeURIComponent(text.trim());
  if (!encodedText) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodedText}`;
}

export function formatPrivacyChecklistText(
  resolution: AudienceResolution,
  privacyMode: PrivacyMode
): string {
  const targetList =
    privacyMode === 'all-except' ? resolution.excluded : resolution.included;
  const actionHeading =
    privacyMode === 'all-except'
      ? `WhatsApp Status Privacy: My contacts except (${targetList.length})`
      : privacyMode === 'only-selected'
        ? `WhatsApp Status Privacy: Only share with (${targetList.length})`
        : `WhatsApp Status Privacy: My contacts (${targetList.length})`;

  const lines = targetList.map((c) => `- ${c.name} (${c.phone})`);
  return [actionHeading, ...lines].join('\n');
}

export function parseBulkContacts(raw: string): {
  valid: Array<{ name: string; phone: string }>;
  invalidLines: string[];
} {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const valid: Array<{ name: string; phone: string }> = [];
  const invalidLines: string[] = [];

  for (const line of lines) {
    const parts = line.split(/[,;\t]+/).map((p) => p.trim());
    if (parts.length < 2) {
      invalidLines.push(line);
      continue;
    }
    const [name, phone] = parts;
    const validation = validateContactInput(name, phone);
    if (validation.valid) {
      valid.push({ name, phone });
    } else {
      invalidLines.push(line);
    }
  }

  return { valid, invalidLines };
}

export function getDefaultScheduleInputs(nowMs: number = Date.now()): {
  date: string;
  time: string;
} {
  const target = new Date(nowMs + 3600 * 1000);
  target.setMinutes(0, 0, 0);
  if (target.getTime() <= nowMs + 60 * 1000) {
    target.setHours(target.getHours() + 1);
  }
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  const hours = String(target.getHours()).padStart(2, '0');
  const mins = String(target.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${mins}`,
  };
}

export function validateScheduledTime(
  dateStr: string,
  timeStr: string,
  nowMs: number = Date.now()
): { valid: boolean; scheduledFor?: number; error?: string } {
  const trimmedDate = dateStr.trim();
  const trimmedTime = timeStr.trim();

  if (!trimmedDate || !trimmedTime) {
    return {
      valid: false,
      error: 'Select both a schedule date and time.',
    };
  }

  const matchDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDate);
  const matchTime = /^(\d{2}):(\d{2})$/.exec(trimmedTime);
  if (!matchDate || !matchTime) {
    return {
      valid: false,
      error: 'Enter a valid date (YYYY-MM-DD) and time (HH:MM).',
    };
  }

  const year = Number(matchDate[1]);
  const month = Number(matchDate[2]);
  const day = Number(matchDate[3]);
  const hour = Number(matchTime[1]);
  const minute = Number(matchTime[2]);

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return {
      valid: false,
      error: 'The selected calendar date is invalid.',
    };
  }

  const scheduledFor = parsed.getTime();
  if (scheduledFor <= nowMs + 30 * 1000) {
    return {
      valid: false,
      error: 'Scheduled time must be at least 1 minute in the future.',
    };
  }

  return {
    valid: true,
    scheduledFor,
  };
}

export function processDueScheduledStatuses(
  records: SharedStatusRecord[],
  nowMs: number = Date.now()
): {
  updated: SharedStatusRecord[];
  newlyPublished: SharedStatusRecord[];
} {
  const newlyPublished: SharedStatusRecord[] = [];

  const updated = records.map((record) => {
    if (
      record.status === 'scheduled' &&
      typeof record.scheduledFor === 'number' &&
      record.scheduledFor <= nowMs
    ) {
      const publishedAt = record.scheduledFor;
      const publishedRecord: SharedStatusRecord = {
        ...record,
        status: 'published',
        sharedAt: publishedAt,
        expiresAt: publishedAt + DAY_MS,
      };
      newlyPublished.push(publishedRecord);
      return publishedRecord;
    }
    return record;
  });

  return { updated, newlyPublished };
}

export function isStatusActive(
  record: Pick<SharedStatusRecord, 'expiresAt' | 'status'>,
  nowMs: number = Date.now()
): boolean {
  if (record.status === 'scheduled') return false;
  return record.expiresAt > nowMs;
}

export function formatRemainingWindow(
  expiresAt: number,
  nowMs: number = Date.now()
): string {
  const diffMs = expiresAt - nowMs;
  if (diffMs <= 0) return 'Expired';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${Math.max(1, minutes)}m left`;
}

export function formatRelativeTime(
  timestamp: number,
  nowMs: number = Date.now()
): string {
  const diffMs = Math.max(0, nowMs - timestamp);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatScheduledDateTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}
