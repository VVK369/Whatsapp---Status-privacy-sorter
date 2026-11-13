import { createSeedState } from '../data/seed';
import type { AppPersistedState } from '../types';

const STORAGE_KEY = 'circlestatus_state_v1';

export function loadPersistedState(): AppPersistedState {
  const seed = createSeedState();
  if (typeof window === 'undefined') return seed;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;

    const parsed = JSON.parse(raw) as Partial<AppPersistedState>;
    if (
      !parsed ||
      !Array.isArray(parsed.contacts) ||
      !Array.isArray(parsed.groups) ||
      !Array.isArray(parsed.history) ||
      !parsed.draft
    ) {
      return seed;
    }

    return {
      contacts: parsed.contacts,
      groups: parsed.groups,
      history: parsed.history,
      draft: {
        ...seed.draft,
        ...parsed.draft,
      },
    };
  } catch {
    return seed;
  }
}

export function savePersistedState(state: AppPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetPersistedState(): AppPersistedState {
  const seed = createSeedState();
  savePersistedState(seed);
  return seed;
}
