import React from 'react';
import { motion, Variants } from 'framer-motion';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface OrbAIProps {
    state: OrbState;
    audioLevel?: number; // Volume from 0 to 1
}

export const OrbAI: React.FC<OrbAIProps> = ({ state, audioLevel = 0 }) => {
    // Calcul de la taille et de la lueur selon le niveau audio en mode "speaking"
    // On s'assure que audioLevel est bien défini et on limite sa valeur
    const safeAudioLevel = Math.max(0, Math.min(1, audioLevel || 0));
    const speakingScale = 1 + (safeAudioLevel * 0.4); // Max scale 1.4
    const speakGlow = 20 + (safeAudioLevel * 60);

    const variants: Variants = {
        idle: {
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6],
            boxShadow: [
                "0 0 15px rgba(255, 60, 60, 0.3)",
                "0 0 25px rgba(255, 60, 60, 0.5)",
                "0 0 15px rgba(255, 60, 60, 0.3)"
            ],
            transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
            }
        },
        listening: {
            scale: [1, 1.15, 1],
            opacity: [0.8, 1, 0.8],
            boxShadow: [
                "0 0 20px rgba(255, 60, 60, 0.5)",
                "0 0 50px rgba(255, 60, 60, 0.8)",
                "0 0 20px rgba(255, 60, 60, 0.5)"
            ],
            transition: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            }
        },
        thinking: {
            scale: [1, 0.95, 1.05, 1],
            rotate: [0, 90, 180, 360],
            opacity: [0.8, 1, 0.8, 1],
            borderRadius: ["50%", "45%", "40%", "50%"],
            boxShadow: "0 0 40px rgba(200, 200, 255, 0.6)",
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "linear",
            }
        },
        speaking: {
            scale: speakingScale,
            opacity: 1,
            boxShadow: `0 0 ${speakGlow}px rgba(255, 100, 100, ${0.6 + safeAudioLevel * 0.4})`,
            transition: {
                duration: 0.1, // Réaction rapide au son
                ease: "easeOut",
            }
        }
    };

    return (
        <div className="relative flex items-center justify-center p-8 w-48 h-48">
            {/* Anneau externe décoratif */}
            <motion.div
                className="absolute inset-0 rounded-full border border-red-500/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />

            {/* L'Orbe principal */}
            <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-orange-400"
                initial="idle"
                animate={state}
                variants={variants}
                style={{
                    backgroundSize: '200% 200%',
                }}
            />

            {/* Reflet interne type "Glassmorphism" */}
            <div className="absolute w-24 h-24 rounded-full bg-white/10 blur-[2px] pointer-events-none" />
        </div>
    );
};
