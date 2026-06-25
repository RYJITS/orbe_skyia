const enabled = () =>
    typeof localStorage !== 'undefined' && localStorage.getItem('skyia_debug') === '1';

export const debugLog = (...args: unknown[]) => {
    if (enabled()) console.log(...args);
};

export const debugWarn = (...args: unknown[]) => {
    if (enabled()) console.warn(...args);
};
