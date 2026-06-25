import { apiGet } from './apiClient';
import { AIModel } from './modelService';

export const discoverAllModels = async (): Promise<AIModel[]> => {
    try {
        const response = await apiGet<{ models: AIModel[] }>('/models');
        return Array.isArray(response.models) ? response.models : [];
    } catch (error) {
        console.error("Mistral discovery failed", error);
        return [];
    }
};

export const discoverFreeModels = discoverAllModels;
