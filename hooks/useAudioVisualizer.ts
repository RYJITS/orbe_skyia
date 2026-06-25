import { useState, useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';

/**
 * Hook to visualize the current active audio stream (AI speech).
 * Returns a volume level between 0 and 1.
 */
export function useAudioVisualizer() {
    const [volume, setVolume] = useState(0);
    const [isActive, setIsActive] = useState(false);

    const animationFrameRef = useRef<number | null>(null);
    const playStartRef = useRef(0);

    useEffect(() => {
        let isLooping = false;

        const loop = () => {
            const analyser = audioService.getAnalyser();
            if (analyser && isLooping) {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;

                // Keep a restrained envelope while Voxtral buffers the next segment.
                const elapsed = (performance.now() - playStartRef.current) / 1000;
                const synthetic = 0.28
                    + Math.sin(elapsed * 9) * 0.12
                    + Math.sin(elapsed * 17) * 0.06;

                let normalizedVolume = avg > 1 ? avg / 64 : synthetic;
                normalizedVolume = Math.min(1, Math.max(0, normalizedVolume));

                // Add a small noise gate to prevent constant twitching
                if (normalizedVolume < 0.02) {
                    normalizedVolume = 0;
                }

                setVolume(normalizedVolume);

                // Keep looping as long as we are active
                animationFrameRef.current = requestAnimationFrame(loop);
            } else {
                // Decay volume smoothly to 0 when stopped
                setVolume(v => {
                    const next = v * 0.8;
                    return next < 0.01 ? 0 : next;
                });

                if (volume > 0) {
                    animationFrameRef.current = requestAnimationFrame(loop);
                }
            }
        };

        const handlePlayStateChange = (playing: boolean) => {
            setIsActive(playing);
            isLooping = playing;
            if (!playing) {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                setVolume(0);
                return;
            }
            if (!animationFrameRef.current) {
                playStartRef.current = performance.now();
                loop();
            }
        };

        // Subscribe to audio state
        audioService.addPlayStateListener(handlePlayStateChange);

        return () => {
            isLooping = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            audioService.removePlayStateListener(handlePlayStateChange); // cleanup
        };
    }, []);

    // For testing without a real stream, expose a way to manually set it
    const simulateSilence = () => { setVolume(0); setIsActive(false); };
    const simulateSpeech = (level: number) => { setVolume(level); setIsActive(true); };

    return { volume, isActive, simulateSilence, simulateSpeech };
}

/**
 * Hook to visualize the user's microphone input.
 * Returns a volume level between 0 and 1.
 */
export function useMicVisualizer(isRecording: boolean) {
    const [volume, setVolume] = useState(0);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isRecording) {
            setVolume(0);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        const loop = () => {
            const analyser = audioService.getMicAnalyser();
            if (analyser) {
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;

                // Normalize 0-1 (64 makes it more sensitive so it pulses visibly)
                let normalizedVolume = avg / 64;
                normalizedVolume = Math.min(1, Math.max(0, normalizedVolume));

                if (normalizedVolume < 0.05) {
                    normalizedVolume = 0;
                }

                setVolume(normalizedVolume);
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        // Give the MediaStream a moment to initialize
        setTimeout(loop, 200);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isRecording]);

    return volume;
}
