import { SavedSession, Message, SkynetAnalysis } from '../types';
import { readStoredArray, writeStoredJson } from './localStorageJson';

const STORAGE_KEY = 'SKY_NET_SAVES_V1';
const MAX_SAVES = 5;
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const getLocalSaves = (): SavedSession[] => readStoredArray<SavedSession>(STORAGE_KEY);

const setLocalSaves = (saves: SavedSession[]): boolean => writeStoredJson(STORAGE_KEY, saves);

export const getSavedSessions = async (): Promise<SavedSession[]> => getLocalSaves();

const sanitizeForStorage = (obj: unknown): JsonValue => {
    if (obj === undefined || obj === null) return null;
    if (Array.isArray(obj)) return obj.map(sanitizeForStorage);
    if (typeof obj === 'object') {
        const newObj: { [key: string]: JsonValue } = {};
        for (const [key, value] of Object.entries(obj)) {
            newObj[key] = sanitizeForStorage(value);
        }
        return newObj;
    }
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
    }
    return null;
};

export const saveSession = async (
    currentId: string | null,
    messages: Message[],
    analysis: SkynetAnalysis,
    credits: number,
    model: string,
    threatHistory: number[],
    mode: 'v1.0' | 'v1.1' = 'v1.0',
    customName?: string
): Promise<{ success: boolean; id: string; error?: string }> => {
    const now = new Date();
    const defaultName = `SIM_${now.toLocaleDateString().replace(/\//g, '')}_${now.toLocaleTimeString().replace(/:/g, '')}`;
    const sessionId = currentId || crypto.randomUUID();
    const newSession: SavedSession = {
        id: sessionId,
        name: customName || defaultName,
        date: now.toISOString(),
        model,
        credits,
        threatLevel: analysis.threatLevel,
        messages,
        analysis: sanitizeForStorage(analysis) as unknown as SkynetAnalysis,
        threatHistory,
        mode,
    };

    const saves = getLocalSaves();
    if (currentId) {
        const index = saves.findIndex((save) => save.id === currentId);
        if (index !== -1) saves[index] = newSession;
        else saves.push(newSession);
    } else {
        if (saves.length >= MAX_SAVES) {
            return { success: false, id: '', error: 'MEMORY BANKS FULL (MAX 5). DELETE A SESSION.' };
        }
        saves.push(newSession);
    }

    return setLocalSaves(saves)
        ? { success: true, id: sessionId }
        : { success: false, id: '', error: 'LOCAL WRITE ERROR' };
};

export const deleteSession = async (id: string): Promise<SavedSession[]> => {
    const saves = getLocalSaves().filter((save) => save.id !== id);
    setLocalSaves(saves);
    return saves;
};

export const renameSession = async (id: string, newName: string): Promise<SavedSession[]> => {
    const saves = getLocalSaves();
    const index = saves.findIndex((save) => save.id === id);
    if (index !== -1) {
        saves[index].name = newName;
        setLocalSaves(saves);
    }
    return saves;
};
