export const sanitizeUserPrompt = (input: string): string => {
    // 1. Remove or escape markdown headers that could mimic system instructions
    // 2. Wrap in XML tags to clearly demarcate user input
    return `<user_input>\n${input.replace(/^#{1,6}\s/gm, (match) => `\\${match.trim()} `)}\n</user_input>`;
};
