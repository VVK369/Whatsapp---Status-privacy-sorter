import {
  Check,
  Edit3,
  MessageSquareShare,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { GROUP_COLORS } from '../data/seed';
import type { Contact, ContactGroup } from '../types';
import { validateGroupInput } from '../utils/audience';

interface GroupsViewProps {
  groups: ContactGroup[];
  contacts: Contact[];
  onCreateGroup: (
    group: Omit<ContactGroup, 'id' | 'createdAt'>,
    memberIds: string[]
  ) => void;
  onUpdateGroup: (
    groupId: string,
    patch: Partial<Omit<ContactGroup, 'id' | 'createdAt'>>,
    memberIds?: string[]
  ) => void;
  onDeleteGroup: (groupId: string) => void;
  onComposeForGroup: (group: ContactGroup) => void;
  externalCreateTrigger?: number;
}

export function GroupsView({
  groups,
  contacts,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onComposeForGroup,
}: GroupsViewProps) {
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [managingMembersGroup, setManagingMembersGroup] =
    useState<ContactGroup | null>(null);

  // Create / Edit form state
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [colorHex, setColorHex] = useState(GROUP_COLORS[0].hex);
  const [defaultPrivacy, setDefaultPrivacy] = useState<'include' | 'exclude'>(
    'include'
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingGroup(null);
    setNameInput('');
    setDescInput('');
    setColorHex(GROUP_COLORS[0].hex);
    setDefaultPrivacy('include');
    setSelectedMemberIds([]);
    setMemberSearch('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (group: ContactGroup) => {
    setEditingGroup(group);
    setNameInput(group.name);
    setDescInput(group.description);
    setColorHex(group.colorHex);
    setDefaultPrivacy(group.defaultPrivacy);
    setSelectedMemberIds(
      contacts.filter((c) => c.groupIds.includes(group.id)).map((c) => c.id)
    );
    setMemberSearch('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openManageMembers = (group: ContactGroup) => {
    setManagingMembersGroup(group);
    setSelectedMemberIds(
      contacts.filter((c) => c.groupIds.includes(group.id)).map((c) => c.id)
    );
    setMemberSearch('');
  };

  const toggleMember = (contactId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateGroupInput(
      nameInput,
      groups,
      editingGroup?.id
    );
    if (!check.valid) {
      setFormError(check.error ?? 'Invalid group name.');
      return;
    }

    if (editingGroup) {
      onUpdateGroup(
        editingGroup.id,
        {
          name: nameInput.trim(),
          description: descInput.trim(),
          colorHex,
          defaultPrivacy,
        },
        selectedMemberIds
      );
    } else {
      onCreateGroup(
        {
          name: nameInput.trim(),
          description: descInput.trim(),
          colorHex,
          defaultPrivacy,
        },
        selectedMemberIds
      );
    }
    setIsCreateOpen(false);
  };

  const handleSaveMembersOnly = () => {
    if (!managingMembersGroup) return;
    onUpdateGroup(managingMembersGroup.id, {}, selectedMemberIds);
    setManagingMembersGroup(null);
  };

  const filteredContactsForPicker = contacts.filter((c) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Custom Contact Circles
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {groups.length} {groups.length === 1 ? 'group' : 'groups'} ·{' '}
            {contacts.length} total contacts available
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>New Group</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <div className="text-sm font-semibold text-slate-900">
            No contact groups yet
          </div>
          <p className="mx-auto max-w-md text-xs text-slate-500">
            Create groups like Family, Close Friends, or Work so you can target your WhatsApp statuses cleanly.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Create First Group</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map((group) => {
            const members = contacts.filter((c) => c.groupIds.includes(group.id));
            return (
              <article
                key={group.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-xs shrink-0"
                        style={{ backgroundColor: group.colorHex }}
                        aria-hidden="true"
                      />
                      <h3 className="text-base font-semibold text-slate-900 truncate">
                        {group.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(group)}
                        aria-label={`Edit group ${group.name}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(group.id)}
                        aria-label={`Delete group ${group.name}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 tabular-nums">
                    {members.length} {members.length === 1 ? 'contact' : 'contacts'} ·{' '}
                    Default: {group.defaultPrivacy === 'include' ? 'Share with' : 'Exclude'}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed min-h-[40px]">
                    {group.description || 'No description provided.'}
                  </p>

                  <div className="pt-1 text-xs text-slate-500 truncate">
                    {members.length === 0
                      ? 'No contacts assigned yet'
                      : members.map((m) => m.name).join(', ')}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onComposeForGroup(group)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
                  >
                    <MessageSquareShare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Compose Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openManageMembers(group)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Members</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Group Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-modal-title"
        >
          <form
            onSubmit={handleSaveGroup}
            className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 id="group-modal-title" className="text-base font-semibold text-slate-900">
                {editingGroup ? `Edit Group "${editingGroup.name}"` : 'Create New Contact Group'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close group modal"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label
                  htmlFor="group-name-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Group Name
                </label>
                <input
                  id="group-name-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setFormError(null);
                    setNameInput(e.target.value);
                  }}
                  placeholder="e.g., Family, Travel Buddies, Gym Crew"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div>
                <label
                  htmlFor="group-desc-input"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Description (Optional)
                </label>
                <input
                  id="group-desc-input"
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Who belongs in this circle?"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-2">
                    Group Color
                  </div>
                  <div className="flex items-center gap-2">
                    {GROUP_COLORS.map((c) => {
                      const active = colorHex === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setColorHex(c.hex)}
                          aria-label={`Select color ${c.name}`}
                          aria-pressed={active}
                          style={{ backgroundColor: c.hex }}
                          className={`h-6 w-6 rounded-full flex items-center justify-center ${
                            active ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                          }`}
                        >
                          {active && (
                            <Check className="h-3 w-3 text-white" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="group-privacy-select"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Default Privacy Behavior
                  </label>
                  <select
                    id="group-privacy-select"
                    value={defaultPrivacy}
                    onChange={(e) =>
                      setDefaultPrivacy(e.target.value as 'include' | 'exclude')
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none"
                  >
                    <option value="include">Only share with this group</option>
                    <option value="exclude">Exclude from general statuses</option>
                  </select>
                </div>
              </div>

              {/* Member Selection inside Create/Edit Modal */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">
                    Assign Contacts ({selectedMemberIds.length} selected)
                  </span>
                </div>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Filter contacts..."
                    aria-label="Filter contacts for group assignment"
                    className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {filteredContactsForPicker.map((contact) => {
                    const checked = selectedMemberIds.includes(contact.id);
                    return (
                      <label
                        key={contact.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(contact.id)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                          />
                          <span className="font-medium text-slate-900 truncate">
                            {contact.name}
                          </span>
                        </span>
                        <span className="font-mono text-slate-400 tabular-nums shrink-0">
                          {contact.phone}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                >
                  {formError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                {editingGroup ? 'Save Group' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Manage Members Modal */}
      {managingMembersGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="members-modal-title"
        >
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 id="members-modal-title" className="text-base font-semibold text-slate-900">
                  Manage "{managingMembersGroup.name}" Members
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {selectedMemberIds.length} of {contacts.length} contacts selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingMembersGroup(null)}
                aria-label="Close member manager"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search contacts..."
                  aria-label="Search contacts"
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {filteredContactsForPicker.map((contact) => {
                const checked = selectedMemberIds.includes(contact.id);
                return (
                  <label
                    key={contact.id}
                    className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(contact.id)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 truncate">
                          {contact.name}
                        </span>
                        <span className="block font-mono text-xs text-slate-500 tabular-nums">
                          {contact.phone}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setManagingMembersGroup(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMembersOnly}
                className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                Save Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
