import { describe, it, expect } from 'vitest';
import { tokenize, TokenType } from '../src/services/expression/tokenizer.js';

describe('tokenizer', () => {
    it('tokenizes numbers', () => {
        const tokens = tokenize('42.5');
        expect(tokens[0].type).toBe(TokenType.NUMBER);
        expect(tokens[0].value).toBe(42.5);
    });

    it('tokenizes scientific notation', () => {
        const tokens = tokenize('1.5e3');
        expect(tokens[0].type).toBe(TokenType.NUMBER);
        expect(tokens[0].value).toBe(1500);
    });

    it('tokenizes strings', () => {
        const tokens = tokenize('"hello"');
        expect(tokens[0].type).toBe(TokenType.STRING);
        expect(tokens[0].value).toBe('hello');
    });

    it('tokenizes identifiers', () => {
        const tokens = tokenize('ma');
        expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[0].value).toBe('ma');
    });

    it('tokenizes operators', () => {
        const tokens = tokenize('a + b');
        expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[1].type).toBe(TokenType.OPERATOR);
        expect(tokens[1].value).toBe('+');
        expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    });

    it('tokenizes function calls', () => {
        const tokens = tokenize('ma(SPX, 20)');
        expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[0].value).toBe('ma');
        expect(tokens[1].type).toBe(TokenType.LPAREN);
        expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[3].type).toBe(TokenType.COMMA);
        expect(tokens[4].type).toBe(TokenType.NUMBER);
        expect(tokens[5].type).toBe(TokenType.RPAREN);
    });

    it('matches known series names with spaces', () => {
        const tokens = tokenize('AEE UN Equity', ['AEE UN Equity']);
        expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[0].value).toBe('AEE UN Equity');
    });

    it('tokenizes assignments', () => {
        const tokens = tokenize('x = SPX');
        expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
        expect(tokens[1].type).toBe(TokenType.EQUALS);
        expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
    });

    it('throws on unknown characters', () => {
        expect(() => tokenize('a @ b')).toThrow();
    });
});
