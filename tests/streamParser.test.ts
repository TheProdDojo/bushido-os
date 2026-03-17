import { describe, it, expect } from 'vitest';
import { StreamParser } from '../services/ai/streamParser';

describe('StreamParser', () => {
    it('should parse simple text', () => {
        const parser = new StreamParser();
        const events = parser.parse("Hello World");
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('text');
        expect(events[0].content).toBe("Hello World");
    });

    it('should extract <thought> tags', () => {
        const parser = new StreamParser();
        const input = "Hello <thought>Thinking...</thought> World";
        const events = parser.parse(input);

        // Expect event for thought
        const thoughtEvent = events.find(e => e.type === 'thinking');
        expect(thoughtEvent).toBeDefined();
        expect(thoughtEvent?.thought).toBe("Thinking...");

        // Expect content to be cleaned
        // Our simple parser flushes content aggressively, so it might be split or appended.
        // In the current implementation:
        // 1. matches thought
        // 2. removing thought from buffer -> "Hello  World"
        // 3. flushes "Hello  World"

        const lastEvent = events[events.length - 1];
        expect(lastEvent.content).toContain("Hello");
        expect(lastEvent.content).toContain("World");
        expect(lastEvent.content).not.toContain("<thought>");
    });

    it('should handle DeepSeek <think> tags', () => {
        const parser = new StreamParser();
        const input = "<think>Deep thoughts</think>Result";
        const events = parser.parse(input);

        const thoughtEvent = events.find(e => e.type === 'thinking');
        expect(thoughtEvent?.thought).toBe("Deep thoughts");
    });
});
