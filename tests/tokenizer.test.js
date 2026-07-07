import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/core/tokenizer.js';

describe('tokenize', () => {
    it('lowercases all tokens', () => {
        expect(tokenize('Hello World')).toEqual(['hello', 'world']);
    });

    it('strips punctuation', () => {
        expect(tokenize('Hello, world!')).toEqual(['hello', 'world']);
    });

    it('splits contractions on the apostrophe (documented behavior, not a bug)', () => {
        expect(tokenize("don't stop")).toEqual(['don', 't', 'stop']);
    });

    it('collapses multiple whitespace characters', () => {
        expect(tokenize('hello    world\n\ttest')).toEqual(['hello', 'world', 'test']);
    });

    it('returns an empty array for an empty string', () => {
        expect(tokenize('')).toEqual([]);
    });

    it('returns an empty array for whitespace-only input', () => {
        expect(tokenize('   \n\t  ')).toEqual([]);
    });

    it('returns an empty array for non-string input', () => {
        expect(tokenize(null)).toEqual([]);
        expect(tokenize(undefined)).toEqual([]);
        expect(tokenize(123)).toEqual([]);
    });

    it('handles numbers mixed with words', () => {
        expect(tokenize('Meeting on July 6 2026')).toEqual(['meeting', 'on', 'july', '6', '2026']);
    });

    it('strips punctuation-only tokens down to nothing', () => {
        expect(tokenize('--- ... !!!')).toEqual([]);
    });
});