import test from 'node:test';
import assert from 'node:assert/strict';
import type { Contact, ContactGroup, SharedStatusRecord } from '../types';
import {
  buildWhatsAppDirectLink,
  formatPrivacyChecklistText,
  formatRemainingWindow,
  getDefaultScheduleInputs,
  getInitials,
  isStatusActive,
  isValidPhone,
  normalizePhone,
  parseBulkContacts,
  processDueScheduledStatuses,
  resolveAudience,
  validateContactInput,
  validateGroupInput,
  validateScheduledTime,
} from './audience';

const sampleGroups: ContactGroup[] = [
  {
    id: 'g-family',
    name: 'Family',
    description: 'Immediate and extended family',
    colorHex: '#0F766E',
    defaultPrivacy: 'include',
    createdAt: 1000,
  },
  {
    id: 'g-friends',
    name: 'Close Friends',
    description: 'Inner circle',
    colorHex: '#2563EB',
    defaultPrivacy: 'include',
    createdAt: 1000,
  },
  {
    id: 'g-work',
    name: 'Work',
    description: 'Colleagues and clients',
    colorHex: '#B45309',
    defaultPrivacy: 'exclude',
    createdAt: 1000,
  },
];

const sampleContacts: Contact[] = [
  {
    id: 'c-1',
    name: 'Asha Menon',
    phone: '+1 415 555 0101',
    initials: 'AM',
    groupIds: ['g-family', 'g-friends'],
    createdAt: 1000,
  },
  {
    id: 'c-2',
    name: 'Rohan Nair',
    phone: '+1 415 555 0102',
    initials: 'RN',
    groupIds: ['g-family'],
    createdAt: 1000,
  },
  {
    id: 'c-3',
    name: 'Liam Carter',
    phone: '+1 415 555 0103',
    initials: 'LC',
    groupIds: ['g-friends', 'g-work'],
    createdAt: 1000,
  },
  {
    id: 'c-4',
    name: 'Priya Verma',
    phone: '+1 415 555 0104',
    initials: 'PV',
    groupIds: ['g-work'],
    createdAt: 1000,
  },
];

test('normalizePhone and isValidPhone handle international formatting', () => {
  assert.equal(normalizePhone('+1 (415) 555-0192'), '14155550192');
  assert.equal(isValidPhone('+1 415 555 0192'), true);
  assert.equal(isValidPhone('12345'), false);
});

test('getInitials extracts clean two-letter initials', () => {
  assert.equal(getInitials('Maya Lin Patel'), 'MP');
  assert.equal(getInitials('Asha'), 'AS');
  assert.equal(getInitials('   '), '?');
});

test('resolveAudience deduplicates contacts across multiple included groups', () => {
  const result = resolveAudience(
    sampleContacts,
    sampleGroups,
    'only-selected',
    ['g-family', 'g-friends']
  );

  assert.deepEqual(
    result.included.map((c) => c.id),
    ['c-1', 'c-2', 'c-3']
  );
  assert.deepEqual(
    result.excluded.map((c) => c.id),
    ['c-4']
  );
  assert.equal(result.whatsappPrivacySetting, 'Only share with...');
});

test('resolveAudience supports all-except exclusion mode for Work contacts', () => {
  const result = resolveAudience(
    sampleContacts,
    sampleGroups,
    'all-except',
    ['g-work']
  );

  assert.deepEqual(
    result.included.map((c) => c.id),
    ['c-1', 'c-2']
  );
  assert.deepEqual(
    result.excluded.map((c) => c.id),
    ['c-3', 'c-4']
  );
  assert.equal(result.whatsappPrivacySetting, 'My contacts except...');
});

test('resolveAudience returns all contacts in all-contacts mode', () => {
  const result = resolveAudience(sampleContacts, sampleGroups, 'all-contacts', ['g-family']);
  assert.equal(result.included.length, 4);
  assert.equal(result.excluded.length, 0);
  assert.equal(result.whatsappPrivacySetting, 'My contacts');
});

test('validateContactInput enforces required fields without silent fallbacks', () => {
  const emptyCheck = validateContactInput('  ', '');
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.errors.name);
  assert.ok(emptyCheck.errors.phone);

  const validCheck = validateContactInput('Maya Patel', '+1 415 555 0192');
  assert.equal(validCheck.valid, true);
  assert.deepEqual(validCheck.errors, {});
});

test('validateGroupInput prevents empty and duplicate group names', () => {
  assert.equal(validateGroupInput('', sampleGroups).valid, false);
  assert.equal(validateGroupInput('family', sampleGroups).valid, false);
  assert.equal(validateGroupInput('Family', sampleGroups, 'g-family').valid, true);
  assert.equal(validateGroupInput('Travel Buddies', sampleGroups).valid, true);
});

test('parseBulkContacts separates valid entries from malformed lines', () => {
  const input = [
    'Elena Gomez, +1 415 555 0120',
    'Invalid Single Column',
    'Noah Kim; +44 20 7946 0958',
    'Short, 123',
  ].join('\n');

  const parsed = parseBulkContacts(input);
  assert.equal(parsed.valid.length, 2);
  assert.equal(parsed.invalidLines.length, 2);
  assert.equal(parsed.valid[0].name, 'Elena Gomez');
});

test('buildWhatsAppDirectLink encodes message and strips punctuation from phone', () => {
  const url = buildWhatsAppDirectLink('+1 (415) 555-0101', 'Sunday brunch at 11!');
  assert.equal(
    url,
    'https://wa.me/14155550101?text=Sunday%20brunch%20at%2011!'
  );
});

test('formatPrivacyChecklistText formats inclusion or exclusion lists clearly', () => {
  const res = resolveAudience(sampleContacts, sampleGroups, 'only-selected', ['g-family']);
  const text = formatPrivacyChecklistText(res, 'only-selected');
  assert.match(text, /Only share with \(2\)/);
  assert.match(text, /Asha Menon/);
  assert.match(text, /Rohan Nair/);
});

test('isStatusActive and formatRemainingWindow track 24h status window', () => {
  const now = 1_700_000_000_000;
  const activeExpires = now + 5 * 3600 * 1000 + 20 * 60 * 1000;
  const expiredAt = now - 60_000;

  assert.equal(isStatusActive({ status: 'published', expiresAt: activeExpires }, now), true);
  assert.equal(isStatusActive({ status: 'scheduled', expiresAt: activeExpires }, now), false);
  assert.equal(formatRemainingWindow(activeExpires, now), '5h 20m left');

  assert.equal(isStatusActive({ status: 'published', expiresAt: expiredAt }, now), false);
  assert.equal(formatRemainingWindow(expiredAt, now), 'Expired');
});

test('validateScheduledTime rejects missing, past, and invalid dates and accepts future slots', () => {
  const now = new Date(2026, 10, 12, 10, 0, 0).getTime();

  assert.equal(validateScheduledTime('', '11:00', now).valid, false);
  assert.equal(validateScheduledTime('2026-11-12', '09:30', now).valid, false);
  assert.equal(validateScheduledTime('2026-02-30', '11:00', now).valid, false);

  const valid = validateScheduledTime('2026-11-12', '14:30', now);
  assert.equal(valid.valid, true);
  assert.equal(valid.scheduledFor, new Date(2026, 10, 12, 14, 30, 0).getTime());

  const defaults = getDefaultScheduleInputs(now);
  assert.equal(defaults.date, '2026-11-12');
  assert.equal(defaults.time, '11:00');
});

test('processDueScheduledStatuses transitions due scheduled statuses to published', () => {
  const now = 1_700_000_000_000;
  const records: SharedStatusRecord[] = [
    {
      id: 'due-1',
      status: 'scheduled',
      format: 'text',
      text: 'Time to go!',
      caption: '',
      bgColorHex: '#0F766E',
      fontStyle: 'sans',
      imageUrl: null,
      imagePresetId: null,
      privacyMode: 'only-selected',
      groupIds: ['g-family'],
      groupNames: ['Family'],
      recipientIds: ['c-1'],
      recipientCount: 1,
      excludedCount: 3,
      createdAt: now - 3600 * 1000,
      scheduledFor: now - 1000,
      sharedAt: now - 1000,
      expiresAt: now - 1000 + 24 * 3600 * 1000,
    },
    {
      id: 'future-1',
      status: 'scheduled',
      format: 'text',
      text: 'Tomorrow update',
      caption: '',
      bgColorHex: '#0F766E',
      fontStyle: 'sans',
      imageUrl: null,
      imagePresetId: null,
      privacyMode: 'only-selected',
      groupIds: ['g-friends'],
      groupNames: ['Close Friends'],
      recipientIds: ['c-3'],
      recipientCount: 1,
      excludedCount: 3,
      createdAt: now - 1000,
      scheduledFor: now + 3600 * 1000,
      sharedAt: now + 3600 * 1000,
      expiresAt: now + 25 * 3600 * 1000,
    },
  ];

  const processed = processDueScheduledStatuses(records, now);
  assert.equal(processed.newlyPublished.length, 1);
  assert.equal(processed.newlyPublished[0].id, 'due-1');
  assert.equal(processed.updated[0].status, 'published');
  assert.equal(processed.updated[1].status, 'scheduled');
});
