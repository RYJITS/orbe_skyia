import { apiGet } from './apiClient';
import { readStoredArray, writeStoredJson } from './localStorageJson';

export interface AIModel {
    id: string;
    name: string;
    cost: number;
    category: 'standard' | 'premium';
    provider: string;
    sourceProvider?: string;
    isFree?: boolean;
    hidden?: boolean;
    requiresUserKey?: boolean;
    contextLength?: number;
}

declare global {
    interface Window {
        resetModels?: () => Promise<void>;
    }
}

const FALLBACK_MISTRAL_MODELS: AIModel[] = [
    { id: 'mistral-small-latest', name: 'MISTRAL SMALL', cost: 0, category: 'standard', provider: 'mistral', isFree: true },
    { id: 'mistral-medium-latest', name: 'MISTRAL MEDIUM', cost: 1, category: 'premium', provider: 'mistral' },
    { id: 'mistral-large-latest', name: 'MISTRAL LARGE', cost: 2, category: 'premium', provider: 'mistral' },
    { id: 'codestral-latest', name: 'CODESTRAL', cost: 1, category: 'premium', provider: 'mistral' },
    { id: 'devstral-latest', name: 'DEVSTRAL', cost: 1, category: 'premium', provider: 'mistral' },
];

let cachedModels: AIModel[] = [];

export const __resetModelCacheForTests = () => {
    cachedModels = [];
};

if (typeof window !== 'undefined') {
    window.resetModels = async () => {
        cachedModels = [];
        alert("Cache modeles reinitialise.");
    };
}

export const fetchModels = async (): Promise<AIModel[]> => {
    let models: AIModel[] = [...cachedModels];

    if (models.length === 0) {
        try {
            const response = await apiGet<{ models: AIModel[] }>('/models');
            models = Array.isArray(response.models) && response.models.length > 0
                ? response.models
                : [...FALLBACK_MISTRAL_MODELS];
        } catch (error) {
            console.warn("[MODEL_SYNC] Fallback local Mistral", error);
            models = [...FALLBACK_MISTRAL_MODELS];
        }
    }

    const customModels = readStoredArray<AIModel>('skyia_custom_models');
    if (customModels.length > 0) {
        const existingIds = new Set(models.map((model) => model.id));
        models = [
            ...models,
            ...customModels.filter((model) => !existingIds.has(model.id)),
        ];
    }

    const banned = readStoredArray<string>('skyia_banned_models');
    if (banned.length > 0) {
        models = models.filter((model) => !banned.includes(model.id));
    }

    models.sort((a, b) => {
        if (a.cost !== b.cost) return a.cost - b.cost;
        return a.name.localeCompare(b.name);
    });

    cachedModels = models;
    return models;
};

export const addCustomModel = (model: AIModel) => {
    const custom = readStoredArray<AIModel>('skyia_custom_models');
    if (!custom.find((entry) => entry.id === model.id)) {
        custom.push({ ...model, provider: model.provider || 'mistral' });
        writeStoredJson('skyia_custom_models', custom);
    }

    const history = readStoredArray<string>('skyia_model_history');
    if (!history.includes(model.id)) {
        history.push(model.id);
        writeStoredJson('skyia_model_history', history);
    }

    const deleted = readStoredArray<string>('skyia_deleted_models')
        .filter((id) => id !== model.id);
    writeStoredJson('skyia_deleted_models', deleted);

    const banned = readStoredArray<string>('skyia_banned_models')
        .filter((id) => id !== model.id);
    writeStoredJson('skyia_banned_models', banned);
    cachedModels = [];
};

export const getModelHistory = (): string[] => readStoredArray<string>('skyia_model_history');

export const removeCustomModel = (modelId: string) => {
    const custom = readStoredArray<AIModel>('skyia_custom_models')
        .filter((model) => model.id !== modelId);
    writeStoredJson('skyia_custom_models', custom);

    const deleted = readStoredArray<string>('skyia_deleted_models');
    if (!deleted.includes(modelId)) {
        deleted.push(modelId);
        writeStoredJson('skyia_deleted_models', deleted);
    }
    cachedModels = [];
};

export const getModelCostFromList = (modelId: string, modelList: AIModel[]): number => {
    const model = modelList.find((entry) => entry.id === modelId);
    if (model) return model.cost;
    if (/small|tiny|mini|free/i.test(modelId)) return 0;
    if (/large/i.test(modelId)) return 2;
    return 1;
};

export const banModel = (modelId: string) => {
    const banned = readStoredArray<string>('skyia_banned_models');
    if (!banned.includes(modelId)) {
        banned.push(modelId);
        writeStoredJson('skyia_banned_models', banned);
    }
    cachedModels = [];
};
