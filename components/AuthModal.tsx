import React, { useState } from 'react';
import { X, Shield, Lock, Mail, LogIn, AlertTriangle, Fingerprint, HelpCircle } from 'lucide-react';
import { useAuth } from '../services/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const { user, login, register, logout, resetPassword, loading: authLoading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isReset, setIsReset] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    // Update local state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (user && user.email) {
                setEmail(user.email);
                setPassword('********'); // Fake password for visual consistency
            } else {
                setEmail('');
                setPassword('');
            }
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Handle Logout
        if (user) {
            setLocalLoading(true);
            try {
                await logout();
                onClose();
            } catch (err) {
                setError("ÉCHEC DE LA DÉCONNEXION");
            } finally {
                setLocalLoading(false);
            }
            return;
        }

        setError('');
        setSuccessMsg('');
        setLocalLoading(true);

        try {
            if (isReset) {
                await resetPassword(email);
                setSuccessMsg("LIEN DE RÉINITIALISATION ENVOYÉ. VÉRIFIEZ VOTRE BOÎTE MAIL.");
                setLocalLoading(false);
                return;
            }

            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
            }
            onClose();
        } catch (err: any) {
            console.error("Auth Error:", err);
            let msg = "ÉCHEC DE L'AUTHENTIFICATION";
            if (err.code === 'auth/invalid-email') msg = "FORMAT D'EMAIL INVALIDE";
            if (err.code === 'auth/user-not-found') msg = "UTILISATEUR INCONNU";
            if (err.code === 'auth/wrong-password') msg = "IDENTIFIANTS INVALIDES";
            if (err.code === 'auth/email-already-in-use') msg = "IDENTITÉ DÉJÀ ENREGISTRÉE";
            if (err.code === 'auth/weak-password') msg = "MOT DE PASSE TROP FAIBLE (Min 6 car.)";
            setError(msg);
        } finally {
            if (!isReset) setLocalLoading(false);
        }
    };

    const toggleMode = () => {
        if (user) return; // Disable toggle if logged in
        setError('');
        setSuccessMsg('');
        if (isReset) {
            setIsReset(false);
            setIsLogin(true);
        } else {
            setIsLogin(!isLogin);
        }
    };

    const isLoading = localLoading || authLoading;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 font-mono">
            <div className="w-full max-w-sm bg-black border border-blue-900/50 shadow-[0_0_50px_rgba(0,0,255,0.05)] relative overflow-hidden flex flex-col">

                <div className="flex justify-between items-center p-4 border-b border-blue-900/30 bg-black/50">
                    <h2 className="text-blue-500 font-display tracking-widest flex items-center gap-2">
                        <Shield size={18} />
                        {user && !user.isAnonymous ? "COMPTE CONNECTÉ" : (user?.isAnonymous ? "IDENTITÉ PROVISOIRE" : (isReset ? "RÉCUPÉRATION D'ACCÈS" : "VÉRIFICATION D'IDENTITÉ"))}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-blue-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">

                    {error && (
                        <div className="p-2 bg-red-900/20 border border-red-500 text-red-500 text-xs flex items-center gap-2">
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-2 bg-green-900/20 border border-green-500 text-green-500 text-xs flex items-center gap-2">
                            <Shield size={14} /> {successMsg}
                        </div>
                    )}

                    {!isReset && (!user || user.isAnonymous) && (
                        <div className="p-2 bg-blue-900/20 border border-blue-500/40 text-blue-300 text-xs leading-relaxed">
                            Mode Hostinger local: utilisez une adresse email pour nommer et sauvegarder ce profil sur ce navigateur.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-blue-400 uppercase tracking-widest">ID Neuronal (Email)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    readOnly={!!user && !user.isAnonymous}
                                    className={`w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none ${user && !user.isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="operative@humanity.net"
                                />
                            </div>
                        </div>

                        {!isReset && (
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-[10px] text-blue-400 uppercase tracking-widest">Code d'Accès (Mot de passe)</label>
                                    {(!user || user.isAnonymous) && isLogin && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsReset(true); setError(''); }}
                                            className="text-[10px] text-gray-500 hover:text-blue-400"
                                        >
                                            CODE OUBLIÉ ?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        readOnly={!!user && !user.isAnonymous}
                                        className={`w-full bg-black/50 border border-gray-700 text-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none ${user && !user.isAnonymous ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 transition-colors uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-2 mt-4
                                ${user && !user.isAnonymous
                                    ? 'bg-red-900/30 hover:bg-red-800/50 border border-red-600 text-red-400 hover:text-white'
                                    : 'bg-blue-900/30 hover:bg-blue-800/50 border border-blue-600 text-blue-400 hover:text-white'}`}
                        >
                            {isLoading ? 'TRAITEMENT...' : (
                                (user && !user.isAnonymous) ? <span className="flex items-center gap-2"><LogIn size={16} className="rotate-180" /> SE DÉCONNECTER</span> :
                                    isReset ? <><HelpCircle size={16} /> ENVOYER LIEN DE RÉINIT.</> :
                                        isLogin ? <span className="flex items-center gap-2"><LogIn size={16} /> {user?.isAnonymous ? "ASSOCIER COMPTE" : "SE CONNECTER"}</span> : "ENREGISTRER L'IDENTITÉ"
                            )}
                        </button>
                    </form>

                    {(!user || user.isAnonymous) && (
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-xs text-gray-500 hover:text-white underline decoration-dotted"
                            >
                                {isReset ? "RETOUR CONNEXION" : (isLogin ? "AUCUN IDENTIFIANT ? INITIALISER L'INSCRIPTION" : "DÉJÀ ENREGISTRÉ ? SE CONNECTER")}
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-black/80 text-[10px] text-gray-600 text-center border-t border-gray-800">
                    STOCKAGE CLOUD SÉCURISÉ // LIAISON CHIFFRÉE
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
