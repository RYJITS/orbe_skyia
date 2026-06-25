export const readStoredArray = <T>(key: string): T[] => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const readStoredObject = <T extends object>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback;
    } catch {
        return fallback;
    }
};

export const writeStoredJson = (key: string, value: unknown): boolean => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`[storage] Failed to write ${key}`, error);
        return false;
    }
};
