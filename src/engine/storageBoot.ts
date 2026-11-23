import { AvatarConfig } from '../types/game';

export const STORAGE_KEY = 'sonnental_hof_save_v1';
export const SETTINGS_KEY = 'sonnental_hof_settings_v1';

export function saveSettings(settings: unknown) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadSettings<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const fb = fallback as Record<string, unknown>;
    if (fb && typeof fb === 'object' && 'keybinds' in fb && parsed && typeof parsed === 'object') {
      return {
        ...fallback,
        ...parsed,
        keybinds: {
          ...(fb.keybinds as Record<string, unknown>),
          ...(parsed.keybinds || {}),
        },
      };
    }
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function peekSavedBootInfo(): { hasSave: boolean; avatar?: AvatarConfig } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hasSave: false };
    const parsed = JSON.parse(raw) as { avatar?: AvatarConfig };
    return {
      hasSave: true,
      avatar: parsed?.avatar && typeof parsed.avatar === 'object' ? parsed.avatar : undefined,
    };
  } catch {
    return { hasSave: false };
  }
}
