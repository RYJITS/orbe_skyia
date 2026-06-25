export interface ModelCostConfig {
    defaultCost: number;
    overrides: Record<string, number>;
    freeKeywords: string[];
}

export const initializePricing = async () => undefined;

export const getModelCost = (modelId: string): number => {
    const normalizedId = modelId.toLowerCase();
    if (/small|tiny|mini|free|ministral/.test(normalizedId)) return 0;
    if (/large/.test(normalizedId)) return 2;
    return 1;
};
