import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/services/expression/tokenizer.js';
import { parse } from '../src/services/expression/parser.js';

const parseStr = (src, known = []) => parse(tokenize(src, known));

describe('parser AST', () => {
    it('parses a single number literal', () => {
        const ast = parseStr('42');
        expect(ast.type).toBe('NumberLiteral');
        expect(ast.value).toBe(42);
    });

    it('parses a series reference', () => {
        const ast = parseStr('SPX');
        expect(ast.type).toBe('SeriesRef');
        expect(ast.name).toBe('SPX');
    });

    it('parses precedence: * binds tighter than +', () => {
        // 1 + 2 * 3 should be (1 + (2 * 3))
        const ast = parseStr('1 + 2 * 3');
        expect(ast.type).toBe('BinaryOp');
        expect(ast.op).toBe('+');
        expect(ast.left.value).toBe(1);
        expect(ast.right.type).toBe('BinaryOp');
        expect(ast.right.op).toBe('*');
    });

    it('parses parentheses to override precedence', () => {
        const ast = parseStr('(1 + 2) * 3');
        expect(ast.type).toBe('BinaryOp');
        expect(ast.op).toBe('*');
        expect(ast.left.type).toBe('BinaryOp');
        expect(ast.left.op).toBe('+');
    });

    it('parses unary minus', () => {
        const ast = parseStr('-SPX');
        expect(ast.type).toBe('UnaryOp');
        expect(ast.op).toBe('-');
        expect(ast.operand.type).toBe('SeriesRef');
    });

    it('parses function calls with multiple args', () => {
        const ast = parseStr('ma(SPX, 20)');
        expect(ast.type).toBe('FunctionCall');
        expect(ast.name).toBe('ma');
        expect(ast.args).toHaveLength(2);
        expect(ast.args[0].type).toBe('SeriesRef');
        expect(ast.args[1].type).toBe('NumberLiteral');
    });

    it('parses nested function calls', () => {
        const ast = parseStr('ma(diff(SPX), 5)');
        expect(ast.type).toBe('FunctionCall');
        expect(ast.args[0].type).toBe('FunctionCall');
        expect(ast.args[0].name).toBe('diff');
    });

    it('parses assignment', () => {
        const ast = parseStr('x = SPX + SPY');
        expect(ast.type).toBe('Assignment');
        expect(ast.name).toBe('x');
        expect(ast.expr.type).toBe('BinaryOp');
    });

    it('parses semicolon display name', () => {
        const ast = parseStr('SPX ; My Title');
        expect(ast.type).toBe('NamedExpr');
        expect(ast.displayName).toBe('My Title');
    });

    it('parses string literals', () => {
        const ast = parseStr('csv("file.csv")');
        expect(ast.args[0].type).toBe('StringLiteral');
        expect(ast.args[0].value).toBe('file.csv');
    });

    it('parses multi-word series names with known list', () => {
        const ast = parseStr('AEE UN Equity + 1', ['AEE UN Equity']);
        expect(ast.type).toBe('BinaryOp');
        expect(ast.left.type).toBe('SeriesRef');
        expect(ast.left.name).toBe('AEE UN Equity');
    });

    it('throws on unconsumed tokens', () => {
        expect(() => parseStr('1 + 2 )')).toThrow();
    });

    it('throws on missing close paren', () => {
        expect(() => parseStr('ma(SPX, 20')).toThrow();
    });
});
