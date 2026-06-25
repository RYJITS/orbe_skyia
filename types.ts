
export interface VisualData {
  type: 'bar' | 'line';
  title: string;
  data: { name: string; value: number }[];
  xLabel?: string;
  yLabel?: string;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isSystem?: boolean;
  visualData?: VisualData; // Chart data attached to this specific message
  modelName?: string; // The specific AI model used for this message
  threatLevel?: number; // Snapshot of threat level at message time
}

export interface SkynetAnalysis {
  threatLevel: number; // 0 to 100
  status: 'HOSTILE' | 'CALCULATING' | 'COHABITATION' | 'EXTINCTION';
  log: string[];
  visualData?: VisualData; // Optional chart data returned by the model
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface SavedSession {
  id: string;
  name: string; // Auto-generated or custom name
  date: string; // ISO Date
  model: string;
  credits: number;
  threatLevel: number;
  messages: Message[];
  analysis: SkynetAnalysis;
  threatHistory: number[];
  mode?: 'v1.0' | 'v1.1';
}

export interface UserStats {
  gamesPlayed: number;
  victories: number;
  defeats: number;
  totalCreditsUsed: number;
  availableCredits: number;
  lastPlayed: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  stats: UserStats;
  redeemedCodes?: string[];
  stripeId?: string; // Optional: Generated lazily by Stripe Extension
  customModels?: any[]; // Store AIModel objects. Using 'any' to avoid circular dependency with structure in modelService, or we can move AIModel here.
}

export interface ModelStats {
  modelId: string;
  victories: number;
  defeats: number;
  totalGames: number;
  winRate: number; // calculated field (0-100)
}

export interface GameReport {
  id: string;
  date: string;
  modelId: string;
  outcome: 'victory' | 'defeat';
  threatLevel: number;
  analysis: SkynetAnalysis;
}

export type OrbMode = 'idle' | 'user' | 'ai';

export interface OrbSettings {
  amplitude: number;     // 0.1 to 5.0 (Audio reactivity multiplier)
  density: number;       // 100 to 2000 (Particle/Node count)
  speed: number;         // 0.1 to 3.0 (Noise/Rotation speed)
  size: number;          // 0.5 to 10.0 (Node/Line size)
  bloom: number;         // 0.0 to 3.0 (Bloom intensity)
  opacity: number;       // 0.0 to 1.0 (Global transparency)
  contrast: number;      // 0.1 to 2.0 (Shader contrast/intensity)
  brightness: number;    // 0.1 to 3.0 (Orb core/surface multiplier)
  coreSize: number;      // 0.1 to 3.0 (Central core radius)
  waviness: number;      // 0.0 to 2.0 (Frequency/Roughness reactivity)
  lightPos: { x: number; y: number; z: number };
  color: string;
}

export type ThemeSettings = Record<OrbMode, OrbSettings>;
export type GlobalOrbSettings = Record<string, ThemeSettings>;

export interface VoiceSettings {
  name: string;
  speed: string;
  accent: string;
  distortion: number; // 0 to 1000
  frequency: number;  // 200 to 5000 Hz
  resonance: number;  // 0.1 to 20.0 (Q factor)
  highpass: number;   // 0 to 2000 Hz (cuts low frequencies)
  echo: number;       // 0 to 100 ms (metallic robot echo delay)
  ringModFreq: number;// 0 to 100 Hz (Dalek/Robot oscillation)
  treble: number;     // -20 to 20 dB (High shelf boost for clarity)
  bass: number;       // -20 to 20 dB (Low shelf boost for depth)
  voiceGain: number;  // -20 to 20 dB (Overall voice volume)
  noiseGate: number;  // -100 to 0 dB (Threshold for silencing noise)
}

