export interface ReasoningResult {
    content: string;
    thought?: string;
}

export const DeepSeekParser = {
    /**
     * Parses the output from DeepSeek R1, extracting the <think> block.
     * Handles streaming chunks or full text.
     */
    parse: (text: string): ReasoningResult => {
        // Regex to capture content inside <think>...</think> locally and the rest
        // Note: This regex assumes the <think> block appears once at the start or is well-contained.
        // It handles the case where </think> might be missing in a stream (partial) but 
        // for the final result we look for the closing tag.

        const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/;
        const match = thinkRegex.exec(text);

        if (match) {
            const thought = match[1].trim();
            // Remove the thought block from the text to get the final content
            const content = text.replace(match[0], '').trim();
            return { content, thought };
        }

        // If no <think> tags found, treat it all as content (or it might be a normal response)
        return { content: text, thought: undefined };
    }
};
