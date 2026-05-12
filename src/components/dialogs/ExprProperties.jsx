import React, { useMemo } from 'react';
import DialogBase from './DialogBase.jsx';
import { usePlotStore } from '../../store/plotStore.js';
import { useAppStore } from '../../store/appStore.js';
import { useDataStore } from '../../store/dataStore.js';
import { tokenize, TokenType } from '../../services/expression/tokenizer.js';
import { parse } from '../../services/expression/parser.js';

const TOKEN_TYPE_LABEL = {
    [TokenType.NUMBER]: 'NUMBER',
    [TokenType.STRING]: 'STRING',
    [TokenType.IDENTIFIER]: 'IDENT',
    [TokenType.LPAREN]: 'LPAREN',
    [TokenType.RPAREN]: 'RPAREN',
    [TokenType.COMMA]: 'COMMA',
    [TokenType.OPERATOR]: 'OP',
    [TokenType.SEMICOLON]: 'SEMI',
    [TokenType.EQUALS]: 'EQUALS',
    [TokenType.EOF]: 'EOF',
};

function collectSeriesRefs(node, acc = new Set()) {
    if (!node || typeof node !== 'object') return acc;
    if (node.type === 'SeriesRef') acc.add(node.name);
    for (const v of Object.values(node)) {
        if (Array.isArray(v)) v.forEach(item => collectSeriesRefs(item, acc));
        else if (v && typeof v === 'object') collectSeriesRefs(v, acc);
    }
    return acc;
}

function renderAst(node, depth = 0) {
    if (!node) return null;
    const indent = '  '.repeat(depth);
    const lines = [];
    if (node.type === 'NumberLiteral') {
        lines.push(`${indent}Number(${node.value})`);
    } else if (node.type === 'StringLiteral') {
        lines.push(`${indent}String("${node.value}")`);
    } else if (node.type === 'SeriesRef') {
        lines.push(`${indent}Series(${node.name})`);
    } else if (node.type === 'BinaryOp') {
        lines.push(`${indent}BinaryOp(${node.op})`);
        lines.push(...renderAst(node.left, depth + 1));
        lines.push(...renderAst(node.right, depth + 1));
    } else if (node.type === 'UnaryOp') {
        lines.push(`${indent}UnaryOp(${node.op})`);
        lines.push(...renderAst(node.operand, depth + 1));
    } else if (node.type === 'FunctionCall') {
        lines.push(`${indent}Call(${node.name})`);
        node.args.forEach(a => lines.push(...renderAst(a, depth + 1)));
    } else if (node.type === 'Assignment') {
        lines.push(`${indent}Assign(${node.name})`);
        lines.push(...renderAst(node.expr, depth + 1));
    } else if (node.type === 'NamedExpr') {
        lines.push(`${indent}Named("${node.displayName}")`);
        lines.push(...renderAst(node.expr, depth + 1));
    } else {
        lines.push(`${indent}${node.type || '?'}`);
    }
    return lines;
}

export default function ExprProperties({ onClose }) {
    const expression = usePlotStore(s => s.plots[s.activePlotId]?.expressions || '');
    const cursorLine = useAppStore(s => s.exprPropertiesLine ?? 0);

    const result = useMemo(() => {
        const lines = expression.split('\n');
        const line = lines[cursorLine] || '';
        if (!line.trim()) {
            return { line, lineNo: cursorLine + 1, empty: true };
        }
        try {
            const cache = useDataStore.getState().seriesCache;
            const known = Object.keys(cache);
            const tokens = tokenize(line, known);
            const ast = parse(tokens);
            const refs = [...collectSeriesRefs(ast)];
            return {
                line,
                lineNo: cursorLine + 1,
                tokens: tokens.filter(t => t.type !== TokenType.EOF),
                astLines: renderAst(ast),
                refs,
            };
        } catch (err) {
            return { line, lineNo: cursorLine + 1, error: err.message };
        }
    }, [expression, cursorLine]);

    return (
        <DialogBase title="Expression Properties" onClose={onClose} width={500} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '8px', fontSize: '11px' }}>
                <div style={{ marginBottom: '6px', color: '#666' }}>
                    Line {result.lineNo}{result.empty ? ' (empty)' : ''}
                </div>
                <div style={{
                    padding: '4px 6px', background: '#f5f5dc',
                    fontFamily: 'Consolas, monospace', fontSize: '12px',
                    border: '1px solid #ddd', marginBottom: '8px',
                    wordBreak: 'break-all',
                }}>
                    {result.line || <span style={{ color: '#999' }}>(blank)</span>}
                </div>

                {result.error && (
                    <div style={{ color: '#c00', padding: '4px 6px', background: '#fee', border: '1px solid #fcc' }}>
                        Parse error: {result.error}
                    </div>
                )}

                {result.astLines && (
                    <>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>AST</div>
                        <pre style={{
                            margin: 0, padding: '4px 6px', fontSize: '11px',
                            fontFamily: 'Consolas, monospace', background: '#fafafa',
                            border: '1px solid #ddd', maxHeight: '180px', overflow: 'auto',
                        }}>{result.astLines.join('\n')}</pre>
                    </>
                )}

                {result.refs && result.refs.length > 0 && (
                    <>
                        <div style={{ fontWeight: 'bold', margin: '8px 0 2px' }}>
                            Series referenced ({result.refs.length})
                        </div>
                        <div style={{
                            padding: '4px 6px', background: '#fafafa', border: '1px solid #ddd',
                            fontFamily: 'Consolas, monospace',
                        }}>
                            {result.refs.join(', ')}
                        </div>
                    </>
                )}

                {result.tokens && (
                    <details style={{ marginTop: '8px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                            Tokens ({result.tokens.length})
                        </summary>
                        <div style={{
                            padding: '4px 6px', background: '#fafafa', border: '1px solid #ddd',
                            fontFamily: 'Consolas, monospace', fontSize: '10px',
                            maxHeight: '120px', overflow: 'auto', marginTop: '2px',
                        }}>
                            {result.tokens.map((t, i) => (
                                <div key={i}>
                                    <span style={{ color: '#888' }}>@{t.pos}</span>{' '}
                                    <span style={{ color: '#1a4f8b' }}>{TOKEN_TYPE_LABEL[t.type]}</span>{' '}
                                    {JSON.stringify(t.value)}
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </DialogBase>
    );
}
