export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  placeName?: string;
  subtitle?: string;
}

const STORAGE_PREFIX = 'vazhikatti_search_history_';
const MAX_HISTORY_ITEMS = 20;

function resolveStorageKey(userId?: string | null): string {
  const cleanId = userId && userId.trim() ? userId.trim().toLowerCase() : 'guest';
  return `${STORAGE_PREFIX}${cleanId}`;
}

/**
 * Loads search history for the given user, sorted with most recent first.
 */
export function getSearchHistory(userId?: string | null): SearchHistoryItem[] {
  try {
    const key = resolveStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list: SearchHistoryItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch (err) {
    console.warn('[searchHistoryService] Failed to load search history:', err);
    return [];
  }
}

/**
 * Adds a search query or selected destination to the user's recent search history.
 * Deduplicates existing entries by query text and brings the latest to the top.
 */
export function addSearchHistory(
  query: string,
  userId?: string | null,
  metadata?: { placeName?: string; subtitle?: string }
): SearchHistoryItem[] {
  const trimmed = query.trim();
  if (!trimmed) return getSearchHistory(userId);

  try {
    const current = getSearchHistory(userId);
    // Remove duplicate entry if it already exists (case-insensitive)
    const filtered = current.filter(
      (item) => item.query.trim().toLowerCase() !== trimmed.toLowerCase()
    );

    const newItem: SearchHistoryItem = {
      id: 'search_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      query: trimmed,
      timestamp: Date.now(),
      placeName: metadata?.placeName,
      subtitle: metadata?.subtitle,
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    const key = resolveStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[searchHistoryService] Failed to record search history:', err);
    return getSearchHistory(userId);
  }
}

/**
 * Removes an individual search history item by its unique ID.
 */
export function removeSearchHistoryItem(
  id: string,
  userId?: string | null
): SearchHistoryItem[] {
  try {
    const current = getSearchHistory(userId);
    const updated = current.filter((item) => item.id !== id);
    const key = resolveStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[searchHistoryService] Failed to remove search history item:', err);
    return getSearchHistory(userId);
  }
}

/**
 * Clears all search history for the user.
 */
export function clearSearchHistory(userId?: string | null): void {
  try {
    const key = resolveStorageKey(userId);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[searchHistoryService] Failed to clear search history:', err);
  }
}
