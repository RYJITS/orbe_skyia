import React, { useEffect, useState } from 'react';
import { getAllModelStats } from '../services/statsService';

const StatsDebugger: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("StatsDebugger mounted. Fetching stats...");
        getAllModelStats()
            .then(data => {
                console.log("Stats fetched successfully:", data);
                setStats(data);
            })
            .catch(err => {
                console.error("Error fetching stats:", err);
                setError(err.message);
            });
    }, []);

    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, background: 'rgba(0,0,0,0.8)', color: 'lime', padding: '10px', zIndex: 9999, fontSize: '10px', pointerEvents: 'none' }}>
            <h3>Stats Debugger</h3>
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}
            <pre>{JSON.stringify(stats, null, 2)}</pre>
        </div>
    );
};

export default StatsDebugger;
