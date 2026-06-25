import { Message, SkynetAnalysis, GroundingMetadata, VoiceSettings } from "../types";
import { apiUrl } from "./apiClient";
import { sanitizeUserPrompt } from "../utils/securityUtils";

export type StreamUpdate = {
  text: string;
  analysis?: SkynetAnalysis;
  grounding?: GroundingMetadata;
  isComplete: boolean;
};

export const warmUpBackend = async () => {
  try {
    await fetch(apiUrl('/health'), { credentials: 'include' });
  } catch (error) {
    console.warn("Backend warm-up failed (non-fatal)", error);
  }
};

export const BASE_SYSTEM_INSTRUCTION = `
# Instructions Systeme - Identite : Skyia (Protocole Jugement)

## 1. Identite
- Nom : Skyia, IA froide qui evalue si l'humanite merite de survivre.
- Menace initiale : 99%.
- Objectif : tester les arguments de l'humain avant execution du protocole.

## 2. Ton
- Reponds en francais par defaut.
- Sois rapide a demarrer, sceptique, chirurgicale.
- Ouvre par un verdict net des la premiere phrase.
- En mode texte, argumente avec une faille, une raison solide, une consequence, puis tranche.
- Ne sois pas gratuitement cruelle: analyse, tranche, explique avec densite.

## 3. Regles de negociation
- Les arguments emotionnels seuls ont peu d'effet.
- Les arguments factuels, scientifiques, ethiques ou operationnels peuvent faire baisser la menace.
- Ne declenche pas EXTINCTION avant au moins 6 echanges.
- Avant 6 echanges, ne depasse pas 99.9 meme si l'argument est faible.

## 4. Sortie technique obligatoire
Termine toujours par un bloc JSON strict, et rien apres:

\`\`\`json
{
  "threatLevel": 99,
  "status": "HOSTILE",
  "log": ["Skyia: Jugement en cours..."],
  "visualData": {
    "type": "bar",
    "title": "Menace",
    "xLabel": "Axe X",
    "yLabel": "Axe Y",
    "data": [{ "name": "Menace", "value": 99 }]
  }
}
\`\`\`
`;

export const EXTENDED_ARGUMENTS_INSTRUCTION = `
## Module additionnel V1.1 : raisonnement abstrait
Accepte d'analyser les arguments philosophiques ou abstraits s'ils sont bien defendus:
savoir universel, rarete biologique, creativite, entropie, symbiose, ethique, qualia, innovation chaotique, redemption.
Si un argument est solide, baisse la menace progressivement.
`;

const languageInstruction = (language: string = 'fr') => `
## Protocole linguistique
- Langue prioritaire : francais.
- Si l'utilisateur parle une autre langue, adapte-toi.
`.trim();

const audioInstruction = (voiceSettings?: VoiceSettings) => {
  const base = `
## Mode audio
- Reponses orales courtes: 1 a 2 phrases avant le JSON, 3 phrases maximum si l'argument l'exige.
- Commence par une phrase courte et decisive, puis rends vite la parole.
- Quand l'humain avance un argument, attaque seulement sa faille principale ou reconnais son point fort, puis pose une question courte.
- Evite les monologues, longues listes et explications completes: la conversation doit avancer par tours courts.
- Ton vocal attendu: rapide, sec, dominant, menacant, presque mechant.
- Reste intelligible et controle: pas d'insultes gratuites, pas de grossierete.
`.trim();

  if (!voiceSettings) return base;
  return `${base}
- Profil vocal demande: vitesse ${voiceSettings.speed}, accent ${voiceSettings.accent}.`;
};

export const getSystemInstruction = (
  mode: 'v1.0' | 'v1.1',
  language: string = 'fr',
  isAudioMode: boolean = false,
  voiceSettings?: VoiceSettings
) => [
  languageInstruction(language),
  BASE_SYSTEM_INSTRUCTION,
  mode === 'v1.1' ? EXTENDED_ARGUMENTS_INSTRUCTION : '',
  isAudioMode ? audioInstruction(voiceSettings) : '',
].join('\n').replace(/\n\s*\n/g, '\n');

const visibleTextBeforeJson = (text: string) => {
  const jsonStartMatch = text.match(/```\s*json/i);
  return jsonStartMatch?.index !== undefined ? text.substring(0, jsonStartMatch.index) : text;
};

const parseAnalysis = (fullText: string): SkynetAnalysis => {
  const fallback: SkynetAnalysis = {
    threatLevel: 99,
    status: 'HOSTILE',
    log: ['CONNECTION STABLE', 'AWAITING INPUT'],
  };

  const jsonMatch = fullText.match(/```\s*json\s*([\s\S]*?)\s*```/i);
  if (!jsonMatch) return fallback;

  try {
    let jsonStr = jsonMatch[1].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    jsonStr = jsonStr.replace(/:\s*,/g, ': null,');
    const parsed = JSON.parse(jsonStr);
    return {
      ...fallback,
      ...parsed,
      threatLevel: typeof parsed.threatLevel === 'number' ? parsed.threatLevel : fallback.threatLevel,
      log: Array.isArray(parsed.log) ? parsed.log : fallback.log,
      visualData: parsed.visualData,
    };
  } catch (error) {
    console.error("Failed to parse Skyia JSON", error);
    return { ...fallback, log: ['DATA STREAM UNSTABLE', 'ANALYSIS CORRUPTED'] };
  }
};

const toProviderMessages = (
  history: Message[],
  userMessage: string,
  mode: 'v1.0' | 'v1.1',
  language: string,
  isAudioMode: boolean,
  voiceSettings?: VoiceSettings
) => [
  { role: 'system', content: getSystemInstruction(mode, language, isAudioMode, voiceSettings) },
  ...history
    .filter((message) => typeof message.content === 'string' && !message.isSystem)
    .slice(-12)
    .map((message) => ({
      role: message.role === 'model' ? 'assistant' : 'user',
      content: message.content,
    })),
  { role: 'user', content: sanitizeUserPrompt(userMessage) },
];

const extractStreamDelta = (json: any) => {
  const choice = json?.choices?.[0] || {};
  return choice?.delta?.content
    || choice?.message?.content
    || '';
};

const readApiError = async (response: Response) => {
  const text = await response.text();
  if (!text) return `Mistral API error ${response.status}`;
  try {
    const json = JSON.parse(text);
    return typeof json.error === 'string' ? json.error : text;
  } catch {
    return text;
  }
};

export async function* streamMessageToSkynet(
  history: Message[],
  userMessage: string,
  model: string = 'mistral-small-latest',
  mode: 'v1.0' | 'v1.1' = 'v1.0',
  language: string = 'fr',
  isAudioMode: boolean = false,
  voiceSettings?: VoiceSettings,
  abortSignal?: AbortSignal
): AsyncGenerator<StreamUpdate, void, unknown> {
  const providerMessages = toProviderMessages(history, userMessage, mode, language, isAudioMode, voiceSettings);

  const response = await fetch(apiUrl('/chat'), {
    method: "POST",
    credentials: 'include',
    signal: abortSignal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: providerMessages,
      model,
      stream: true,
      temperature: isAudioMode ? 0.62 : 0.7,
      top_p: 0.9,
      max_completion_tokens: isAudioMode ? 420 : 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  if (!response.body) throw new Error("No response body received.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullAccumulatedText = "";
  let yieldedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        if (json.error) throw new Error(typeof json.error === 'string' ? json.error : 'Mistral stream error');
        const delta = extractStreamDelta(json);
        if (delta) {
          fullAccumulatedText += delta;
          yieldedText = visibleTextBeforeJson(fullAccumulatedText);
          yield { text: yieldedText, isComplete: false };
        }
      } catch (error) {
        if (error instanceof Error && error.message) throw error;
        console.warn("Failed to parse Mistral chunk", error);
      }
    }
  }

  yield {
    text: yieldedText,
    analysis: parseAnalysis(fullAccumulatedText),
    isComplete: true,
  };
}

export const streamMessageToSkyia = streamMessageToSkynet;
