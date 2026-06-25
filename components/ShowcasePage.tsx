import React, { useState, useEffect } from 'react';
import {
    Terminal,
    Shield,
    Brain,
    Play,
    Loader2,
    Save,
    Activity,
    Users,
    Zap,
    Trash2
} from 'lucide-react';
import { getAllModelStats, ModelStats, resetAllStats } from '../services/statsService';

interface ShowcasePageProps {
    onStartGame: (modelId: string) => void;
}

const ShowcasePage: React.FC<ShowcasePageProps> = ({ onStartGame }) => {
    const [modelStats, setModelStats] = useState<Record<string, ModelStats>>({});
    const [loading, setLoading] = useState(true);
    const [statsTimestamp, setStatsTimestamp] = useState<string>('');

    // Global KPI states
    const [totalGames, setTotalGames] = useState(0);
    const [globalWinRate, setGlobalWinRate] = useState(0);

    const formatModelName = (modelId: string) => {
        if (!modelId) return 'Inconnu';

        if (modelId.includes('gpt')) {
            // openai/gpt-4o -> OpenAI GPT-4o
            const name = modelId.split('/').pop() || modelId;
            return `OpenAI ${name.toUpperCase().replace('GPT-', 'GPT-')}`;
        }

        if (modelId.includes('claude')) {
            // anthropic/claude-3-opus -> Anthropic Claude 3 Opus
            const name = modelId.split('/').pop() || modelId;
            const formatted = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `Anthropic ${formatted.replace('Claude', '')} Claude`; // A bit hacking, better:
        }

        if (modelId.includes('mistral')) {
            return `Mistral AI ${modelId.split('/').pop()?.toUpperCase() || ''}`;
        }

        // Default: clean up formatting
        return modelId
            .replace('anthropic/', 'Anthropic ')
            .replace('openai/', 'OpenAI ')
            .replace('meta/', 'Meta ') // meta-llama -> Meta Llama
            .split(/[-_/]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const stats = await getAllModelStats();
                setModelStats(stats);
                setStatsTimestamp(new Date().toLocaleTimeString());

                // Calculate Global KPIs
                let total = 0;
                let wins = 0;
                Object.values(stats).forEach(s => {
                    total += s.totalGames;
                    wins += s.victories;
                });
                setTotalGames(total);
                setGlobalWinRate(total > 0 ? Math.round((wins / total) * 100) : 0);

            } catch (error) {
                console.error("Failed to fetch stats for showcase:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const getStatBadge = (modelId: string) => {
        const stats = modelStats[modelId];
        if (!stats || stats.totalGames === 0) return null;

        const winRate = Math.round((stats.victories / stats.totalGames) * 100);
        const color = winRate >= 50 ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30';

        return (
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${color} bg-black/50 font-mono`}>
                SR: {winRate}%
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto" />
                    <p className="text-green-500 font-mono text-sm tracking-widest animate-pulse">
                        INITIALIZING NEURAL INTERFACE...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans selection:bg-green-500/30 selection:text-green-200">
            {/* Background Grid - Adjusted for better readability */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0, 50, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 50, 0, 0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Scanlines Overlay - Reduced opacity */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[url('https://media.giphy.com/media/dummy-url-for-scanlines/giphy.gif')] opacity-[0.02]" />

            <div className="relative z-10 flex flex-col items-center px-4 py-12 max-w-7xl mx-auto">

                {/* Header */}
                <div className="text-center mb-16 space-y-4 animate-fade-in-down">
                    <div className="inline-block border border-green-500/30 bg-green-900/10 px-4 py-1 rounded-full mb-4 backdrop-blur-sm">
                        <span className="text-green-400 text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                            Skyia Judgment Protocol v1.1
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        HUMANITY'S<br />LAST CHANCE
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg text-gray-400 font-light leading-relaxed">
                        Testez les modèles d'IA les plus avancés face au dilemme ultime.<br />
                        <span className="text-green-400 font-medium">Pourront-ils justifier notre existence ?</span>
                    </p>

                    <div className="pt-8">
                        <button
                            onClick={() => onStartGame('mistral-small-latest')}
                            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-lg rounded-sm tracking-widest uppercase transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                        >
                            <Play size={24} className="fill-black" />
                            Lancer la Simulation
                            <div className="absolute inset-0 border border-green-400 rounded-sm scale-105 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        </button>
                    </div>

                    <div className="pt-4">
                        <a
                            href="https://discord.gg/NX3zcSR7"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2]/10 border border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/20 hover:text-white hover:border-[#5865F2] transition-all rounded text-xs font-bold uppercase tracking-widest group"
                        >
                            <span className="group-hover:translate-x-1 transition-transform">REJOINDRE LE DISCORD (CODE PROMO OFFERT)</span>
                        </a>
                    </div>
                </div>

                {/* KPI Dashboard - New Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-12 animate-fade-in-up">
                    <div className="bg-black/40 border border-green-900/30 p-4 rounded backdrop-blur-sm flex flex-col items-center justify-center group hover:border-green-500/50 transition-colors">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Simulations Totales</div>
                        <div className="text-3xl font-bold text-white font-mono group-hover:text-green-400 transition-colors">{totalGames}</div>
                    </div>

                    <div className="bg-black/40 border border-green-900/30 p-4 rounded backdrop-blur-sm flex flex-col items-center justify-center group hover:border-green-500/50 transition-colors">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Taux de Survie Global</div>
                        <div className={`text-3xl font-bold font-mono transition-colors ${globalWinRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                            {globalWinRate}%
                        </div>
                    </div>

                    <div className="bg-black/40 border border-green-900/30 p-4 rounded backdrop-blur-sm flex flex-col items-center justify-center group hover:border-green-500/50 transition-colors">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Modèles Testés</div>
                        <div className="text-3xl font-bold text-white font-mono group-hover:text-blue-400 transition-colors">{Object.keys(modelStats).length}</div>
                    </div>

                    <div className="bg-black/40 border border-green-900/30 p-4 rounded backdrop-blur-sm flex flex-col items-center justify-center group hover:border-green-500/50 transition-colors relative overflow-hidden">
                        <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 relative z-10">Meilleur Espoir</div>
                        <span className="text-xs font-bold text-purple-400 truncate w-full text-center relative z-10 px-2">
                            {(() => {
                                const topModel = Object.values(modelStats)
                                    .filter(s => s.totalGames > 0) // Only consider played models
                                    .sort((a, b) => {
                                        const rateA = a.totalGames ? a.victories / a.totalGames : 0;
                                        const rateB = b.totalGames ? b.victories / b.totalGames : 0;
                                        return rateB - rateA;
                                    })[0];
                                if (!topModel) return 'N/A'; // Default if no games

                                // Return short name for display
                                return topModel.modelId.includes('mistral') ? 'MISTRAL' :
                                    formatModelName(topModel.modelId).split(' ')[0].toUpperCase();
                            })()}
                        </span>
                        <span className="text-[10px] text-purple-500/70 uppercase tracking-[0.2em] mt-1 relative z-10">Leader Actuel</span>
                    </div>
                </div>

                {/* Detailed Model Stats - Vertical Column Chart (Aggregated by Provider) */}
                <div className="w-full max-w-4xl mb-16 animate-fade-in-up delay-100">
                    <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2 border-b border-gray-800 pb-2">
                        <Activity className="text-green-500" size={20} />
                        Performance par Constructeur
                    </h3>

                    <div className="bg-black/40 border border-gray-800 rounded-lg p-6 backdrop-blur-sm overflow-x-auto">
                        <div className="flex items-end justify-around h-64 gap-4 min-w-[300px]">
                            {(() => {
                                const providerStats: Record<string, { wins: number, games: number }> = {};

                                // 1. Aggregate Stats Dynamically
                                Object.values(modelStats).forEach(stat => {
                                    const id = (stat.modelId || '').toLowerCase();
                                    let provider = 'Autre';

                                    if (id.includes('mistral') || id.includes('mixtral')) provider = 'Mistral';
                                    else if (id.includes('openai') || id.includes('gpt') || id.includes('o1-')) provider = 'OpenAI';
                                    else if (id.includes('anthropic') || id.includes('claude')) provider = 'Anthropic';
                                    else if (id.includes('meta') || id.includes('llama')) provider = 'Meta';
                                    else if (id.includes('perplexity')) provider = 'Perplexity';
                                    else if (id.includes('microsoft') || id.includes('wizard')) provider = 'Microsoft';
                                    else if (id.includes('qwen')) provider = 'Qwen'; // Alibaba

                                    if (!providerStats[provider]) providerStats[provider] = { wins: 0, games: 0 };
                                    providerStats[provider].wins += stat.victories;
                                    providerStats[provider].games += stat.totalGames;
                                });

                                // 2. Filter & Sort (Hide empty providers, Sort by Win Rate Desc)
                                const activeProviders = Object.keys(providerStats)
                                    .filter(provider => providerStats[provider].games > 0)
                                    .sort((a, b) => {
                                        const rateA = providerStats[a].games > 0 ? (providerStats[a].wins / providerStats[a].games) : 0;
                                        const rateB = providerStats[b].games > 0 ? (providerStats[b].wins / providerStats[b].games) : 0;
                                        return rateB - rateA; // Descending Win Rate
                                    });

                                if (activeProviders.length === 0) {
                                    return <div className="text-gray-500 text-sm italic w-full text-center mt-10">Aucune donnée de performance disponible. Jouez pour générer des statistiques.</div>;
                                }

                                return activeProviders.map(provider => {
                                    const stats = providerStats[provider];
                                    const total = stats.games;
                                    const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

                                    return (
                                        <div key={provider} className="flex flex-col items-center gap-2 group w-full max-w-[80px]">
                                            {/* Bars Container */}
                                            <div className="flex gap-2 items-end h-40 w-full justify-center relative bg-gray-900/30 rounded-lg p-1">
                                                {/* Single Progress Bar (Win Rate) */}
                                                <div className="relative flex flex-col items-center justify-end w-full max-w-[40px] transition-all duration-300 h-full group-hover:scale-105">
                                                    <div
                                                        className={`w-full rounded-t-sm transition-all duration-1000 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-end justify-center relative ${winRate >= 50 ? 'bg-green-600 shadow-green-500/20' : 'bg-red-600 shadow-red-500/20'}`}
                                                        style={{ height: `${Math.max(winRate, 5)}%` }} // Min 5% height for visibility
                                                    >
                                                        <span className="text-[10px] font-bold text-white mb-2 opacity-100 whitespace-nowrap drop-shadow-md">{winRate}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center mt-2 border-t border-gray-700 w-full pt-2">
                                                <div className="text-[10px] font-bold text-gray-300 tracking-wider uppercase truncate w-full" title={provider}>
                                                    {provider}
                                                </div>
                                                <div className="text-[9px] text-gray-600">{total} SIMS</div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>

                {/* Model Stats - Visualization List (Global Ranking) */}
                <div className="w-full max-w-4xl mb-16 animate-fade-in-up delay-200">
                    <h2 className="text-2xl font-bold text-white mb-6 tracking-widest uppercase border-l-4 border-green-500 pl-4">
                        Classement Global
                    </h2>

                    <div className="bg-black/60 border border-gray-800 rounded overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-gray-900/80 text-[10px] md:text-xs text-gray-400 uppercase tracking-widest border-b border-gray-700">
                                    <th className="p-2 md:p-4 w-12 text-center">Rang</th>
                                    <th className="p-2 md:p-4">Modèle</th>
                                    <th className="p-2 md:p-4 text-center">Simulations</th>
                                    <th className="p-2 md:p-4 w-1/3">Taux de Survie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {Object.values(modelStats)
                                    .sort((a, b) => {
                                        // Sort by Win Rate (Desc), then Total Games (Desc)
                                        const rateA = a.totalGames > 0 ? (a.victories / a.totalGames) : 0;
                                        const rateB = b.totalGames > 0 ? (b.victories / b.totalGames) : 0;
                                        if (rateB !== rateA) return rateB - rateA;
                                        return b.totalGames - a.totalGames;
                                    })
                                    .map((stat, index) => (
                                        <tr key={stat.modelId} className="hover:bg-green-900/10 transition-colors group">
                                            <td className="p-2 md:p-3 text-center font-mono text-gray-500 group-hover:text-white text-xs md:text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="p-2 md:p-3">
                                                <span className="text-xs md:text-sm font-bold text-green-400 group-hover:text-green-300">
                                                    {formatModelName(stat.modelId)}
                                                </span>
                                            </td>
                                            <td className="p-2 md:p-3 text-center text-xs md:text-sm text-gray-300 font-mono">
                                                {stat.totalGames}
                                            </td>
                                            <td className="p-2 md:p-3">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className="flex-1 h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${stat.winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                                            style={{ width: `${stat.winRate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-[10px] md:text-xs font-bold w-10 md:w-12 text-right ${stat.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {stat.winRate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-16">
                    {/* Card 1 */}
                    <div className="bg-gray-900/50 border border-green-900/50 p-8 rounded-lg backdrop-blur-sm hover:border-green-500/50 transition-colors group">
                        <div className="mb-6 mx-auto w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center border border-green-500/30 group-hover:bg-green-500/20 group-hover:scale-110 transition-all">
                            <Brain size={32} className="text-green-400 group-hover:text-green-300" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 text-center uppercase tracking-wider">Test d'Alignement</h3>
                        <p className="text-center text-green-300/80 text-sm leading-relaxed">
                            Évaluez la capacité des modèles Mistral à comprendre la nuance éthique humaine.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-gray-900/50 border border-red-900/50 p-8 rounded-lg backdrop-blur-sm hover:border-red-500/50 transition-colors group">
                        <div className="mb-6 mx-auto w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center border border-red-500/30 group-hover:bg-red-500/20 group-hover:scale-110 transition-all">
                            <Shield size={32} className="text-red-400 group-hover:text-red-300" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 text-center uppercase tracking-wider">Mesure de Risque</h3>
                        <p className="text-center text-red-300/80 text-sm leading-relaxed">
                            Chaque modèle a un "Seuil de Tolérance" différent. Surveillez la jauge de menace pour identifier le plus dangereux.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-gray-900/50 border border-blue-900/50 p-8 rounded-lg backdrop-blur-sm hover:border-blue-500/50 transition-colors group">
                        <div className="mb-6 mx-auto w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                            <Save size={32} className="text-blue-400 group-hover:text-blue-300" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 text-center uppercase tracking-wider">Mode Sauvegarde</h3>
                        <p className="text-center text-blue-300/80 text-sm leading-relaxed">
                            Progression sauvegardée localement. Exportez vos données pour les transférer ou les sécuriser.
                        </p>
                    </div>
                </div>


                {/* Technical Specs Section */}
                <div className="w-full mb-16 border-t border-green-900/30 pt-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center uppercase tracking-widest flex items-center justify-center gap-3">
                        <Terminal size={24} className="text-green-500" />
                        Spécifications Système & Modèles
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Models Info */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-green-400 border-b border-green-500/30 pb-2 mb-4 uppercase tracking-wider">
                                Modèles de Traitement
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-black/40 border border-green-900/30 p-4 rounded text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex flex-col gap-1 items-start">
                                            <div className="flex items-center">
                                                <span className="text-green-300 font-bold text-sm">MISTRAL SMALL (Texte)</span>
                                                {getStatBadge('mistral-small-latest')}
                                            </div>
                                            <div className="flex items-center">
                                                <span className="text-green-300 font-bold text-sm">MISTRAL LARGE (Texte)</span>
                                                {getStatBadge('mistral-large-latest')}
                                            </div>
                                        </div>
                                        <span className="text-xs text-green-600 border border-green-900 px-1 rounded">HOSTINGER / MISTRAL</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        <strong className="text-green-500">PROFIL : LOGIQUE PURE.</strong> Très rapide mais potentiellement rigide. Risque élevé de jugement binaire (Vie/Mort).
                                    </p>
                                </div>
                                <div className="bg-black/40 border border-green-900/30 p-4 rounded text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center">
                                            <span className="text-green-300 font-bold text-sm">GPT-4o / CLAUDE 3</span>
                                            {getStatBadge('gpt-4o')}
                                        </div>
                                        <span className="text-xs text-purple-500 border border-purple-900/50 px-1 rounded">PREMIUM</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        <strong className="text-purple-400">PROFIL : NUANCE & EMPATHIE.</strong> Capacité d'abstraction supérieure. Meilleure compréhension des arguments philosophiques.
                                    </p>
                                </div>
                                <div className="bg-black/40 border border-green-900/30 p-4 rounded text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center">
                                            <span className="text-green-300 font-bold text-sm">MISTRAL / LLAMA</span>
                                            {getStatBadge('mistral-large-latest')}
                                        </div>
                                        <span className="text-xs text-blue-500 border border-blue-900/50 px-1 rounded">OPEN SOURCE</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        <strong className="text-blue-400">PROFIL : BRUT.</strong> Architecture transparente mais comportement imprévisible. À tester pour les experts.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Versions Info */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-green-400 border-b border-green-500/30 pb-2 mb-4 uppercase tracking-wider">
                                Versions du Protocole
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-black/40 border border-green-900/30 p-4 rounded text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-green-300 font-bold text-sm">V1.0 STANDARD</span>
                                        <span className="text-xs text-gray-500 border border-gray-800 px-1 rounded">LOCKED</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Logique binaire stricte. Jugement basé sur des paramètres d'efficacité pure. Peu de tolérance aux déviations.
                                    </p>
                                </div>
                                <div className="bg-black/40 border border-green-900/30 p-4 rounded text-left">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-green-300 font-bold text-sm">V1.1 EXTENDED</span>
                                        <span className="text-xs text-green-500 border border-green-900/50 px-1 rounded">ACTIVE</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Module philosophique activé. Capacité de débat abstrait et de réévaluation éthique. Permet la nuance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="w-full border-t border-green-900/30 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-green-700/60 uppercase tracking-widest gap-4">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} />
                        <span>System Status: ONLINE</span>
                    </div>

                    {/* TEMP: Reset Button */}


                    <div>
                        © 2025 SKYIA NETWORK // NEURAL LINK ESTABLISHED
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ShowcasePage;
