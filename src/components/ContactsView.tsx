import {
  Edit3,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Contact, ContactGroup } from '../types';
import { parseBulkContacts, validateContactInput } from '../utils/audience';

interface ContactsViewProps {
  contacts: Contact[];
  groups: ContactGroup[];
  onAddContact: (input: {
    name: string;
    phone: string;
    notes?: string;
    groupIds: string[];
  }) => void;
  onUpdateContact: (
    contactId: string,
    patch: { name: string; phone: string; notes?: string; groupIds: string[] }
  ) => void;
  onToggleContactGroup: (contactId: string, groupId: string) => void;
  onDeleteContact: (contactId: string) => void;
  onBulkImportContacts: (
    entries: Array<{ name: string; phone: string }>,
    groupIds: string[]
  ) => void;
}

export function ContactsView({
  contacts,
  groups,
  onAddContact,
  onUpdateContact,
  onToggleContactGroup,
  onDeleteContact,
  onBulkImportContacts,
}: ContactsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Add/Edit Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [contactErrors, setContactErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  // Bulk import modal state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkGroupIds, setBulkGroupIds] = useState<string[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter((c) => {
      const matchesGroup =
        groupFilter === 'all'
          ? true
          : groupFilter === 'ungrouped'
            ? c.groupIds.length === 0
            : c.groupIds.includes(groupFilter);

      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      return matchesGroup && matchesSearch;
    });
  }, [contacts, groupFilter, searchQuery]);

  const openAddModal = () => {
    setEditingContact(null);
    setNameInput('');
    setPhoneInput('');
    setNotesInput('');
    setSelectedGroupIds(
      groupFilter !== 'all' && groupFilter !== 'ungrouped' ? [groupFilter] : []
    );
    setContactErrors({});
    setIsContactModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setNameInput(contact.name);
    setPhoneInput(contact.phone);
    setNotesInput(contact.notes ?? '');
    setSelectedGroupIds([...contact.groupIds]);
    setContactErrors({});
    setIsContactModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateContactInput(nameInput, phoneInput);
    if (!check.valid) {
      setContactErrors(check.errors);
      return;
    }

    if (editingContact) {
      onUpdateContact(editingContact.id, {
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        notes: notesInput.trim() || undefined,
        groupIds: selectedGroupIds,
      });
    } else {
      onAddContact({
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        notes: notesInput.trim() || undefined,
        groupIds: selectedGroupIds,
      });
    }
    setIsContactModalOpen(false);
  };

  const parsedBulk = useMemo(() => parseBulkContacts(bulkText), [bulkText]);

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBulk.valid.length === 0) {
      setBulkError(
        'Enter at least one valid contact line formatted as: Name, +14155550192'
      );
      return;
    }
    setBulkError(null);
    onBulkImportContacts(parsedBulk.valid, bulkGroupIds);
    setIsBulkOpen(false);
    setBulkText('');
    setBulkGroupIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Search & Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name or phone..."
              aria-label="Search contacts"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            aria-label="Filter contacts by group"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-teal-700 focus:outline-none"
          >
            <option value="all">All Groups ({contacts.length})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({contacts.filter((c) => c.groupIds.includes(g.id)).length})
              </option>
            ))}
            <option value="ungrouped">
              Ungrouped ({contacts.filter((c) => c.groupIds.length === 0).length})
            </option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setBulkText('');
              setBulkGroupIds([]);
              setBulkError(null);
              setIsBulkOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Bulk Import</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <div className="text-sm font-medium text-slate-900">
            No matching contacts found
          </div>
          <p className="text-xs text-slate-500">
            Adjust your search query or group filter, or add a new WhatsApp contact.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {(searchQuery || groupFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGroupFilter('all');
                }}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Add Contact
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">WhatsApp Number</th>
                  <th className="px-5 py-3">Assigned Groups</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
                          {contact.initials}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {contact.name}
                          </div>
                          {contact.notes && (
                            <div className="text-xs text-slate-500">
                              {contact.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {contact.phone}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {groups.map((group) => {
                          const member = contact.groupIds.includes(group.id);
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => onToggleContactGroup(contact.id, group.id)}
                              aria-pressed={member}
                              className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                member
                                  ? 'border-teal-700 bg-teal-50 text-teal-800'
                                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {group.name}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(contact)}
                          aria-label={`Edit contact ${contact.name}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteContact(contact.id)}
                          aria-label={`Delete contact ${contact.name}`}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isContactModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <form
            onSubmit={handleSaveContact}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3
                id="contact-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                {editingContact ? `Edit "${editingContact.name}"` : 'Add WhatsApp Contact'}
              </h3>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                aria-label="Close contact dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label
                  htmlFor="contact-name-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="contact-name-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setContactErrors((prev) => ({ ...prev, name: undefined }));
                    setNameInput(e.target.value);
                  }}
                  placeholder="e.g., Maya Patel"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                {contactErrors.name && (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {contactErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-phone-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  WhatsApp Phone Number
                </label>
                <input
                  id="contact-phone-input"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setContactErrors((prev) => ({ ...prev, phone: undefined }));
                    setPhoneInput(e.target.value);
                  }}
                  placeholder="+1 415 555 0192"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                {contactErrors.phone && (
                  <p role="alert" className="mt-1 text-xs text-red-600">
                    {contactErrors.phone}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-notes-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Relationship / Note (Optional)
                </label>
                <input
                  id="contact-notes-input"
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="e.g., Cousin, Product Manager"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 mb-2">
                  Assign to Groups
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {groups.map((g) => {
                    const checked = selectedGroupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedGroupIds((prev) =>
                              prev.includes(g.id)
                                ? prev.filter((id) => id !== g.id)
                                : [...prev, g.id]
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                        />
                        <span className="truncate">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                {editingContact ? 'Save Changes' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-modal-title"
        >
          <form
            onSubmit={handleBulkSubmit}
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 id="bulk-modal-title" className="text-base font-semibold text-slate-900">
                Bulk Import Contacts
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                aria-label="Close bulk import dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label
                  htmlFor="bulk-import-textarea"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Paste one contact per line (Name, Phone)
                </label>
                <textarea
                  id="bulk-import-textarea"
                  rows={5}
                  value={bulkText}
                  onChange={(e) => {
                    setBulkError(null);
                    setBulkText(e.target.value);
                  }}
                  placeholder={'Elena Gomez, +1 415 555 0120\nNoah Kim, +44 20 7946 0958'}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
                {bulkText.trim() && (
                  <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                    Detected {parsedBulk.valid.length} valid contacts
                    {parsedBulk.invalidLines.length > 0
                      ? ` · ${parsedBulk.invalidLines.length} skipped`
                      : ''}
                  </p>
                )}
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 mb-2">
                  Add Imported Contacts to Groups
                </div>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => {
                    const checked = bulkGroupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 cursor-pointer hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setBulkGroupIds((prev) =>
                              prev.includes(g.id)
                                ? prev.filter((id) => id !== g.id)
                                : [...prev, g.id]
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700"
                        />
                        <span>{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {bulkError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                >
                  {bulkError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Import {parsedBulk.valid.length > 0 ? `(${parsedBulk.valid.length})` : ''}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
