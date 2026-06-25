import { readStoredObject, writeStoredJson } from './localStorageJson';

const STATS_KEY = 'skyia_model_stats';

export interface ModelStats {
    modelId: string;
    victories: number;
    defeats: number;
    totalGames: number;
    winRate: number;
    totalVictoryTurnCount?: number;
    totalDefeatTurnCount?: number;
    totalVictoryThreatLevel?: number;
}

export const recordGameResult = async (
    modelId: string,
    result: 'VICTORY' | 'DEFEAT',
    turnCount: number,
    finalThreatLevel: number
) => {
    const statsMap = readStoredObject<Record<string, ModelStats>>(STATS_KEY, {});
    const current = statsMap[modelId] || {
        modelId,
        victories: 0,
        defeats: 0,
        totalGames: 0,
        winRate: 0,
        totalVictoryTurnCount: 0,
        totalDefeatTurnCount: 0,
        totalVictoryThreatLevel: 0,
    };

    current.totalGames += 1;
    if (result === 'VICTORY') {
        current.victories += 1;
        current.totalVictoryTurnCount = (current.totalVictoryTurnCount || 0) + turnCount;
        current.totalVictoryThreatLevel = (current.totalVictoryThreatLevel || 0) + finalThreatLevel;
    } else {
        current.defeats += 1;
        current.totalDefeatTurnCount = (current.totalDefeatTurnCount || 0) + turnCount;
    }
    current.winRate = current.totalGames > 0 ? Math.round((current.victories / current.totalGames) * 100) : 0;
    statsMap[modelId] = current;
    writeStoredJson(STATS_KEY, statsMap);
};

export const getAllModelStats = async (): Promise<Record<string, ModelStats>> =>
    readStoredObject<Record<string, ModelStats>>(STATS_KEY, {});

export const resetAllStats = async () => {
    writeStoredJson(STATS_KEY, {});
};

export const recordModelLatency = async (_metrics: unknown): Promise<void> => undefined;
export const recordDualReport = async (_report: unknown): Promise<void> => undefined;
