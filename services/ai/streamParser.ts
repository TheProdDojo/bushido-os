export interface ParsedEvent {
    type: 'thinking' | 'text' | 'done';
    content?: string;
    thought?: string;
    title?: string;
    isComplete: boolean;
}

export class StreamParser {
    private buffer: string = "";
    private aggregated: string = "";
    private title: string = "";

    parse(chunk: string): ParsedEvent[] {
        this.buffer += chunk;
        const events: ParsedEvent[] = [];

        // 1. Parse <thought> tags (Standard)
        let thoughtMatch;
        while ((thoughtMatch = this.buffer.match(/<thought>([\s\S]*?)<\/thought>/)) !== null) {
            events.push({
                type: 'thinking',
                content: this.aggregated,
                thought: thoughtMatch[1],
                isComplete: false
            });
            this.buffer = this.buffer.replace(thoughtMatch[0], "");
        }

        // 2. Parse <think> tags (DeepSeek)
        let dsMatch;
        while ((dsMatch = this.buffer.match(/<think>([\s\S]*?)<\/think>/)) !== null) {
            events.push({
                type: 'thinking',
                content: this.aggregated,
                thought: dsMatch[1],
                isComplete: false
            });
            this.buffer = this.buffer.replace(dsMatch[0], "");
        }

        // 3. Parse <plan> tags (Deep Research)
        let planMatch;
        while ((planMatch = this.buffer.match(/<plan>([\s\S]*?)<\/plan>/)) !== null) {
            events.push({
                type: 'thinking',
                content: this.aggregated,
                thought: `PLAN: ${planMatch[1]}`,
                isComplete: false
            });
            this.buffer = this.buffer.replace(planMatch[0], "");
        }

        // Update aggregated text with remaining buffer (which is now just text)
        // Wait, we shouldn't clear buffer if it might contain partial tags.
        // But for simplicity in this V1 parser, we assume tags come in reasonably complete or we handle them next time?
        // Actually, if buffer ends with "<tha", we should keep it.
        // But to keep it simple and robust enough for now:
        // We moved the "content" logic to be: whatever is NOT a tag is content.

        // However, if we flush buffer to aggregated, we might break a tag that is being streamed.
        // e.g. "<th" receives, we flush "<th", then "ink>..." comes.
        // So we should only flush if we are sure it's not a start of a tag.

        // Robust partial-tag buffering: keep any trailing content that looks like
        // the start of an XML tag (e.g. "<", "<thi", "</bri", "</thought" etc.)
        const partialTagMatch = this.buffer.match(/<[a-z/]*$/i);
        if (partialTagMatch) {
            const splitAt = partialTagMatch.index!;
            const safeChunk = this.buffer.slice(0, splitAt);
            this.buffer = this.buffer.slice(splitAt);
            if (safeChunk) {
                this.aggregated += safeChunk;
                events.push({ type: 'text', content: this.aggregated, title: this.title, isComplete: false });
            }
        } else {
            this.aggregated += this.buffer;
            this.buffer = "";
            events.push({ type: 'text', content: this.aggregated, title: this.title, isComplete: false });
        }

        // Extract title check
        if (!this.title) {
            const m = this.aggregated.match(/^#\s+(.*?)(\n|$)/);
            if (m) this.title = m[1];
        }

        return events;
    }
}
