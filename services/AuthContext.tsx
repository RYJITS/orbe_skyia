import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '../types';
import { readStoredObject, writeStoredJson } from './localStorageJson';

export interface AppUser {
    uid: string;
    email: string | null;
    displayName?: string | null;
    isAnonymous?: boolean;
    getIdToken?: () => Promise<string>;
}

interface AuthContextType {
    user: AppUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
    authError: string | null;
}

const PROFILE_KEY = 'skyia_local_profile';
const AUTH_KEY = 'skyia_local_auth';

const defaultStats = () => ({
    gamesPlayed: 0,
    victories: 0,
    defeats: 0,
    totalCreditsUsed: 0,
    availableCredits: 20,
    lastPlayed: new Date().toISOString(),
});

const guestProfile = (): UserProfile => ({
    uid: 'guest-local',
    email: '',
    displayName: 'Invite local',
    createdAt: new Date().toISOString(),
    stats: defaultStats(),
});

const profileToUser = (profile: UserProfile, isAnonymous = false): AppUser => ({
    uid: profile.uid,
    email: profile.email || null,
    displayName: profile.displayName,
    isAnonymous,
    getIdToken: async () => 'local-session',
});

const readProfile = () => readStoredObject<UserProfile>(PROFILE_KEY, guestProfile());

const persistProfile = (profile: UserProfile) => {
    writeStoredJson(PROFILE_KEY, profile);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AppUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const loadProfile = () => {
        const profile = readProfile();
        const authState = readStoredObject<{ isAnonymous?: boolean }>(AUTH_KEY, { isAnonymous: true });
        setUserProfile(profile);
        setUser(profileToUser(profile, authState.isAnonymous !== false));
        setAuthError(null);
        return profile;
    };

    useEffect(() => {
        loadProfile();
        setLoading(false);
    }, []);

    const login = async (email: string, _pass: string) => {
        if (!email.trim()) throw new Error('Email requis.');
        const existing = readProfile();
        const profile: UserProfile = {
            ...existing,
            uid: existing.uid && existing.uid !== 'guest-local'
                ? existing.uid
                : `local-${crypto.randomUUID()}`,
            email: email.trim(),
            displayName: existing.displayName && existing.displayName !== 'Invite local'
                ? existing.displayName
                : email.split('@')[0],
            createdAt: existing.createdAt || new Date().toISOString(),
            stats: existing.stats || defaultStats(),
        };
        persistProfile(profile);
        writeStoredJson(AUTH_KEY, { isAnonymous: false, email: profile.email });
        setUser(profileToUser(profile, false));
        setUserProfile(profile);
        setAuthError(null);
    };

    const register = async (email: string, pass: string) => {
        await login(email, pass);
    };

    const loginWithGoogle = async () => {
        throw new Error('Connexion Google desactivee dans la version Hostinger locale.');
    };

    const logout = async () => {
        writeStoredJson(AUTH_KEY, { isAnonymous: true });
        const profile = readProfile();
        setUser(profileToUser(profile, true));
        setUserProfile(profile);
    };

    const resetPassword = async (_email: string) => {
        throw new Error('Reinitialisation de mot de passe indisponible en mode local Hostinger.');
    };

    const refreshProfile = async () => {
        loadProfile();
    };

    const isAdmin = userProfile?.email === 'admin@skyia.net' || false;

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            loading,
            isAdmin,
            authError,
            login,
            register,
            loginWithGoogle,
            logout,
            resetPassword,
            refreshProfile,
        }}>
            {loading ? (
                <div className="h-screen w-full bg-black text-green-500 flex flex-col items-center justify-center font-mono">
                    <div className="animate-spin mb-4">
                        <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <div className="text-sm tracking-widest animate-pulse">
                        INITIALISATION DU PROTOCOLE...
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
