// AST-based Expression Evaluator with date alignment and auto-loading
import { tokenize } from './tokenizer.js';
import { parse } from './parser.js';
import { dateAlign } from './dateAlign.js';
import { registry } from '../functions/registry.js';
import { withStats } from '../stats/withStats.js';
import { loadCsvSeries } from '../csv/loader.js';
import { useDataStore } from '../../store/dataStore.js';
import { useAppStore } from '../../store/appStore.js';
import '../functions/core.js';

/**
 * Auto-load a series by name from the filesystem.
 * Tries multiple filename patterns to find a matching CSV.
 * Caches the result for future lookups.
 */
async function autoLoadSeries(name) {
    const store = useDataStore.getState();

    // Check cache first (exact then case-insensitive)
    const cached = store.getFromCache(name);
    if (cached) return cached;

    const rootPath = useAppStore.getState().rootPath;

    // Try different file name patterns
    const patterns = [
        name.replace(/ /g, '_') + '.csv',       // "AEE UN Equity" → "AEE_UN_Equity.csv"
        name,                                     // exact name (if user typed full filename)
        name + '.csv',                           // append .csv
        name.replace(/ /g, '_'),                  // underscored without extension
    ];

    for (const pattern of patterns) {
        const filePath = rootPath + '/' + pattern;
        try {
            const series = await loadCsvSeries(filePath);
            // Cache under both the ticker name from the CSV and the user-typed name
            useDataStore.getState().addToCache(series.name, series);
            if (series.name !== name) {
                useDataStore.getState().addToCache(name, series);
            }
            return series;
        } catch {
            // Try next pattern
        }
    }

    throw new Error(`Series '${name}' not found. Check the name matches a file in the data folder.`);
}

/**
 * Evaluate a single expression line. Async because series may need auto-loading.
 * Context holds intermediate named results from assignments.
 */
// 3C: Track series currently being resolved to detect circular references
const resolving = new Set();

export async function evaluateExpression(exprText, context = {}) {
    const cache = useDataStore.getState().seriesCache;
    const knownNames = [...Object.keys(cache), ...Object.keys(context)];
    const tokens = tokenize(exprText.trim(), knownNames);
    const ast = parse(tokens);
    return await evalNode(ast, context);
}

/**
 * Evaluate multiple lines (split by newlines). Later lines can reference
 * results from earlier lines via assignment names.
 * Returns array of all non-assignment results (or assignment results too).
 */
export async function evaluateMultiline(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const context = {};
    const results = [];

    for (const line of lines) {
        const result = await evaluateExpression(line, context);
        if (result?._assignmentName) {
            context[result._assignmentName] = result;
        }
        if (result) {
            results.push(result);
        }
    }

    return results;
}

async function evalNode(node, context) {
    switch (node.type) {
        case 'NumberLiteral':
            return { _isConstant: true, value: node.value };

        case 'StringLiteral':
            return { _isString: true, value: node.value };

        case 'SeriesRef': {
            // 3C: Circular reference detection
            if (resolving.has(node.name.toLowerCase())) {
                throw new Error(`Circular reference detected: '${node.name}' references itself`);
            }

            // Check context first (from assignments in earlier lines)
            if (context[node.name]) return context[node.name];
            const ciCtxKey = Object.keys(context).find(k => k.toLowerCase() === node.name.toLowerCase());
            if (ciCtxKey) return context[ciCtxKey];

            // Check cache
            const cached = useDataStore.getState().getFromCache(node.name);
            if (cached) return cached;

            // Auto-load from filesystem
            resolving.add(node.name.toLowerCase());
            try {
                return await autoLoadSeries(node.name);
            } finally {
                resolving.delete(node.name.toLowerCase());
            }
        }

        case 'FunctionCall': {
            const fnName = node.name;
            const fn = registry.get(fnName);

            // Evaluate all arguments (may be async due to series loading)
            const evaluatedArgs = [];
            for (const arg of node.args) {
                evaluatedArgs.push(await evalNode(arg, context));
            }

            // Resolve constants and strings to raw values
            const args = evaluatedArgs.map(a => {
                if (a?._isConstant) return a.value;
                if (a?._isString) return a.value;
                return a;
            });

            return fn(...args);
        }

        case 'BinaryOp': {
            const left = await evalNode(node.left, context);
            const right = await evalNode(node.right, context);
            return applyBinaryOp(node.op, left, right);
        }

        case 'UnaryOp': {
            const operand = await evalNode(node.operand, context);
            if (operand?._isConstant) {
                return { _isConstant: true, value: -operand.value };
            }
            return withStats({
                ...operand,
                name: `-${operand.name}`,
                values: operand.values.map(v => v !== null ? -v : null)
            });
        }

        case 'Assignment': {
            const result = await evalNode(node.expr, context);
            if (result) {
                result._assignmentName = node.name;
                if (!result.name || result.name === node.name) {
                    result.name = node.name;
                }
            }
            return result;
        }

        case 'NamedExpr': {
            const result = await evalNode(node.expr, context);
            if (result && node.displayName) {
                result.name = node.displayName;
            }
            return result;
        }

        default:
            throw new Error(`Unknown AST node type: ${node.type}`);
    }
}

function applyBinaryOp(op, left, right) {
    const leftIsConst = left?._isConstant;
    const rightIsConst = right?._isConstant;

    if (leftIsConst && rightIsConst) {
        return { _isConstant: true, value: applyOp(op, left.value, right.value) };
    }

    if (leftIsConst && !rightIsConst) {
        return withStats({
            ...right,
            name: `${left.value} ${op} ${right.name}`,
            values: right.values.map(v => v !== null ? applyOp(op, left.value, v) : null)
        });
    }

    if (!leftIsConst && rightIsConst) {
        return withStats({
            ...left,
            name: `${left.name} ${op} ${right.value}`,
            values: left.values.map(v => v !== null ? applyOp(op, v, right.value) : null)
        });
    }

    // Series op Series — date-align
    const aligned = dateAlign(left, right);
    const values = [];
    for (let i = 0; i < aligned.dates.length; i++) {
        const lv = aligned.leftValues[i];
        const rv = aligned.rightValues[i];
        values.push(lv !== null && rv !== null ? applyOp(op, lv, rv) : null);
    }

    return withStats({
        name: `${left.name} ${op} ${right.name}`,
        path: null,
        dates: aligned.dates,
        values
    });
}

function applyOp(op, a, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b !== 0 ? a / b : null;
        default: throw new Error(`Unknown operator: ${op}`);
    }
}

