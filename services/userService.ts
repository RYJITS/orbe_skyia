import { UserProfile, UserStats } from '../types';
import { AIModel } from './modelService';
import { readStoredArray, readStoredObject, writeStoredJson } from './localStorageJson';

const PROFILE_KEY = 'skyia_local_profile';

const defaultStats = (): UserStats => ({
    gamesPlayed: 0,
    victories: 0,
    defeats: 0,
    totalCreditsUsed: 0,
    availableCredits: 20,
    lastPlayed: new Date().toISOString(),
});

const defaultProfile = (uid = 'guest-local'): UserProfile => ({
    uid,
    email: '',
    displayName: 'Invite local',
    createdAt: new Date().toISOString(),
    stats: defaultStats(),
});

const readProfile = (uid?: string): UserProfile => {
    const profile = readStoredObject<UserProfile>(PROFILE_KEY, defaultProfile(uid));
    if (!profile.stats) profile.stats = defaultStats();
    if (uid && profile.uid !== uid && profile.uid === 'guest-local') profile.uid = uid;
    return profile;
};

const saveProfile = (profile: UserProfile) => {
    writeStoredJson(PROFILE_KEY, profile);
};

const mutateProfile = async (uid: string, mutator: (profile: UserProfile) => void) => {
    const profile = readProfile(uid);
    mutator(profile);
    profile.stats.lastPlayed = new Date().toISOString();
    saveProfile(profile);
};

export const createUserProfile = async (user: { uid: string; email?: string | null; displayName?: string | null }): Promise<UserProfile> => {
    const profile: UserProfile = {
        ...readProfile(user.uid),
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Invite local',
        createdAt: new Date().toISOString(),
        stats: readProfile(user.uid).stats || defaultStats(),
    };
    saveProfile(profile);
    return profile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => readProfile(uid);
export const refreshUserProfile = async (uid: string): Promise<UserProfile | null> => readProfile(uid);

export const updateUserStats = async (uid: string, result: 'VICTORY' | 'DEFEAT', creditsUsed: number): Promise<void> => {
    await mutateProfile(uid, (profile) => {
        profile.stats.gamesPlayed += 1;
        profile.stats.victories += result === 'VICTORY' ? 1 : 0;
        profile.stats.defeats += result === 'DEFEAT' ? 1 : 0;
        profile.stats.totalCreditsUsed += creditsUsed;
    });
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
    await mutateProfile(uid, (profile) => {
        Object.assign(profile, data);
        profile.stats = data.stats || profile.stats || defaultStats();
    });
};

export const addUserCredits = async (uid: string, amount: number): Promise<void> => {
    await mutateProfile(uid, (profile) => {
        profile.stats.availableCredits = Math.max(0, (profile.stats.availableCredits || 0) + amount);
    });
};

export const refundUserCredits = async (uid: string, amount: number): Promise<void> => {
    await mutateProfile(uid, (profile) => {
        profile.stats.availableCredits = Math.max(0, (profile.stats.availableCredits || 0) + amount);
        profile.stats.totalCreditsUsed = Math.max(0, (profile.stats.totalCreditsUsed || 0) - amount);
    });
};

export const deductUserCredits = async (uid: string, amount: number): Promise<void> => {
    await mutateProfile(uid, (profile) => {
        profile.stats.availableCredits = Math.max(0, (profile.stats.availableCredits || 0) - amount);
        profile.stats.totalCreditsUsed = (profile.stats.totalCreditsUsed || 0) + amount;
    });
};

const promoCodes: Record<string, { credits: number; maxUses: number }> = {
    SKYIA2025: { credits: 50, maxUses: 1000 },
    WELCOME: { credits: 20, maxUses: 5000 },
    BETA: { credits: 100, maxUses: 100 },
    ALIGNMENT: { credits: 25, maxUses: 500 },
};

export const initializePromoCodes = async (): Promise<void> => {
    writeStoredJson('skyia_promo_codes', promoCodes);
};

export const redeemPromoCode = async (uid: string, code: string): Promise<{ success: boolean; message: string; creditsAdded: number }> => {
    const normalizedCode = code.toUpperCase().trim();
    const available = readStoredObject<Record<string, { credits: number; maxUses: number }>>('skyia_promo_codes', promoCodes);
    const promo = available[normalizedCode];
    if (!promo) return { success: false, message: 'Code invalide', creditsAdded: 0 };

    const profile = readProfile(uid);
    const redeemedCodes = profile.redeemedCodes || [];
    if (redeemedCodes.includes(normalizedCode)) {
        return { success: false, message: 'Code deja utilise', creditsAdded: 0 };
    }

    profile.redeemedCodes = [...redeemedCodes, normalizedCode];
    profile.stats.availableCredits = (profile.stats.availableCredits || 0) + promo.credits;
    profile.stats.lastPlayed = new Date().toISOString();
    saveProfile(profile);

    return {
        success: true,
        message: `Code accepte: +${promo.credits} credits`,
        creditsAdded: promo.credits,
    };
};

export const deleteUserAccount = async (_uid: string) => {
    localStorage.removeItem(PROFILE_KEY);
};

export const saveCustomModelToProfile = async (_uid: string, model: AIModel) => {
    const custom = readStoredArray<AIModel>('skyia_custom_models');
    if (!custom.find((entry) => entry.id === model.id)) {
        custom.push(model);
        writeStoredJson('skyia_custom_models', custom);
    }
};

export const syncCloudModelsToLocal = (cloudModels: AIModel[]) => {
    if (!cloudModels || cloudModels.length === 0) return;
    const local = readStoredArray<AIModel>('skyia_custom_models');
    const deletedIds = new Set(readStoredArray<string>('skyia_deleted_models'));
    const localIds = new Set(local.map((model) => model.id));
    let changed = false;

    cloudModels.forEach((model) => {
        if (!localIds.has(model.id) && !deletedIds.has(model.id)) {
            local.push(model);
            changed = true;
        }
    });

    if (changed) writeStoredJson('skyia_custom_models', local);
};

export const removeCustomModelFromProfile = async (_uid: string, model: AIModel) => {
    const custom = readStoredArray<AIModel>('skyia_custom_models')
        .filter((entry) => entry.id !== model.id);
    writeStoredJson('skyia_custom_models', custom);
};
