import { VoiceSettings } from "../types";
import { apiUrl } from "./apiClient";

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

class AudioService {
    private recognition: SpeechRecognition | null = null;
    private isListening = false;
    private audioContext: AudioContext | null = null;
    public analyser: AnalyserNode | null = null;
    private micStream: MediaStream | null = null;
    public micAnalyser: AnalyserNode | null = null;
    private currentSource: AudioBufferSourceNode | null = null;
    private currentVoiceNodes: AudioNode[] = [];
    private isPlaying = false;
    private playStateListeners: Set<(isPlaying: boolean) => void> = new Set();
    private voiceSettings: VoiceSettings | null = null;
    private speechQueue: Promise<void> = Promise.resolve();
    private speechQueueToken = 0;
    private queuedSpeechCount = 0;

    constructor() {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'fr-FR';
        }
    }

    public initAudioContext() {
        if (typeof window === 'undefined') return;
        if (!this.audioContext || this.audioContext.state === 'closed') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            this.audioContext = new AudioContextClass();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => undefined);
        }
    }

    public updateVoiceSettings(settings: VoiceSettings) {
        this.voiceSettings = settings;
    }

    public async requestMicPermission(): Promise<boolean> {
        if (!navigator.mediaDevices?.getUserMedia) return false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            this.attachMicStream(stream);
            return true;
        } catch (error) {
            console.warn("[AudioService] Microphone permission denied", error);
            return false;
        }
    }

    private attachMicStream(stream: MediaStream) {
        this.initAudioContext();
        if (!this.audioContext) return;
        this.micStream = stream;
        const source = this.audioContext.createMediaStreamSource(stream);
        this.micAnalyser = this.audioContext.createAnalyser();
        this.micAnalyser.fftSize = 256;
        source.connect(this.micAnalyser);
    }

    public startListening(
        onResult: (text: string, isFinal: boolean) => void,
        onError: (error: string) => void,
        onEnd: () => void,
        onSpeechDetected?: () => void
    ): void {
        if (!this.recognition) {
            this.requestMicPermission().then((granted) => {
                if (!granted) onError("Microphone permission denied.");
            });
            this.isListening = true;
            return;
        }
        if (this.isListening) return;

        this.recognition.onspeechstart = onSpeechDetected ? () => onSpeechDetected() : null;
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let fullTranscript = '';
            let hasFinal = false;
            for (let index = 0; index < event.results.length; index += 1) {
                fullTranscript += event.results[index][0].transcript;
                hasFinal = hasFinal || event.results[index].isFinal;
            }
            onResult(fullTranscript, hasFinal);
        };
        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            this.isListening = false;
            onError(event.error || event.message || 'speech-recognition-error');
        };
        this.recognition.onend = () => {
            this.isListening = false;
            onEnd();
        };

        try {
            this.recognition.start();
            this.isListening = true;
            if (!this.micStream) {
                navigator.mediaDevices?.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                })
                    .then((stream) => this.attachMicStream(stream))
                    .catch(() => undefined);
            }
        } catch (error) {
            this.isListening = false;
            onError(error instanceof Error ? error.message : 'Failed to start recording.');
        }
    }

    public stopListening(): void {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
        this.isListening = false;
    }

    public isSupported(): boolean {
        return !!this.recognition;
    }

    public getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }

    public getMicAnalyser(): AnalyserNode | null {
        return this.micAnalyser;
    }

    public addPlayStateListener(callback: (isPlaying: boolean) => void) {
        this.playStateListeners.add(callback);
    }

    public removePlayStateListener(callback: (isPlaying: boolean) => void) {
        this.playStateListeners.delete(callback);
    }

    private setPlaying(isPlaying: boolean) {
        this.isPlaying = isPlaying;
        this.playStateListeners.forEach((callback) => callback(isPlaying));
    }

    public queueSpeech(text: string): Promise<void> {
        const cleaned = text.replace(/```\s*json[\s\S]*?```/gi, '').trim();
        if (!cleaned) return Promise.resolve();

        const token = this.speechQueueToken;
        this.queuedSpeechCount += 1;
        this.speechQueue = this.speechQueue
            .catch(() => undefined)
            .then(async () => {
                if (token !== this.speechQueueToken) return;
                await this.synthesizeSpeech(cleaned, { interrupt: false, token });
            })
            .finally(() => {
                this.queuedSpeechCount = Math.max(0, this.queuedSpeechCount - 1);
                if (this.queuedSpeechCount === 0 && this.isPlaying) this.setPlaying(false);
            });
        return this.speechQueue;
    }

    public async synthesizeSpeech(
        text: string,
        options: { interrupt?: boolean; token?: number; queued?: boolean } = {}
    ): Promise<void> {
        const cleaned = text.replace(/```\s*json[\s\S]*?```/gi, '').trim();
        if (!cleaned) return;

        if (options.interrupt !== false) {
            this.speechQueueToken += 1;
            this.speechQueue = Promise.resolve();
            this.queuedSpeechCount = 0;
            this.stopActiveSpeech();
        }
        this.initAudioContext();

        const response = await fetch(apiUrl('/speech'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: cleaned,
                model: 'voxtral-mini-tts-2603',
                response_format: 'mp3',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Voxtral TTS failed ${response.status}: ${errorText.slice(0, 240)}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (options.token !== undefined && options.token !== this.speechQueueToken) return;
        await this.playArrayBuffer(arrayBuffer, options.queued === true);
    }

    private async playArrayBuffer(arrayBuffer: ArrayBuffer, keepPlayingAfterEnd = false): Promise<void> {
        this.initAudioContext();
        if (!this.audioContext || !this.analyser) return;

        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        this.shapeAggressiveVoice(source);
        await new Promise<void>(async (resolve) => {
            source.onended = () => {
                if (this.currentSource === source) {
                    this.currentSource = null;
                    this.disconnectVoiceNodes();
                }
                if (!keepPlayingAfterEnd) this.setPlaying(false);
                resolve();
            };
            this.currentSource = source;
            if (!this.isPlaying) this.setPlaying(true);
            if (this.audioContext?.state === 'suspended') {
                await this.audioContext.resume().catch(() => undefined);
            }
            try {
                source.start(0);
            } catch {
                if (!keepPlayingAfterEnd) this.setPlaying(false);
                resolve();
            }
        });
    }

    private shapeAggressiveVoice(source: AudioBufferSourceNode) {
        if (!this.audioContext || !this.analyser) return;

        const requestedSpeed = (this.voiceSettings?.speed || '').toLowerCase();
        source.playbackRate.value = requestedSpeed.includes('rapide')
            ? 1.08
            : requestedSpeed.includes('lente')
                ? 0.92
                : 1.0;

        const lowShelf = this.audioContext.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 155;
        lowShelf.gain.value = 3.2;

        const growlBoost = this.audioContext.createBiquadFilter();
        growlBoost.type = 'peaking';
        growlBoost.frequency.value = 820;
        growlBoost.Q.value = 0.9;
        growlBoost.gain.value = 2.4;

        const presenceControl = this.audioContext.createBiquadFilter();
        presenceControl.type = 'peaking';
        presenceControl.frequency.value = 3100;
        presenceControl.Q.value = 0.85;
        presenceControl.gain.value = 1.2;

        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 12;
        compressor.ratio.value = 3.2;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.14;

        source.connect(lowShelf);
        lowShelf.connect(growlBoost);
        growlBoost.connect(presenceControl);
        presenceControl.connect(compressor);
        compressor.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.currentVoiceNodes = [lowShelf, growlBoost, presenceControl, compressor];
    }

    private disconnectVoiceNodes() {
        for (const node of this.currentVoiceNodes) {
            try {
                node.disconnect();
            } catch {
                // Node can already be disconnected after a natural playback end.
            }
        }
        this.currentVoiceNodes = [];
    }

    private stopActiveSpeech(): void {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch {
                // Source may already be stopped.
            }
            this.currentSource.disconnect();
            this.currentSource = null;
        }
        this.disconnectVoiceNodes();
        if (this.isPlaying) this.setPlaying(false);
    }

    public stopSpeech(): void {
        this.speechQueueToken += 1;
        this.speechQueue = Promise.resolve();
        this.queuedSpeechCount = 0;
        this.stopActiveSpeech();
    }

    public destroyAudio() {
        this.stopSpeech();
        this.stopListening();
        this.micStream?.getTracks().forEach((track) => track.stop());
        this.micStream = null;
        this.micAnalyser = null;
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => undefined);
        }
        this.audioContext = null;
        this.analyser = null;
    }
}

export const audioService = new AudioService();
