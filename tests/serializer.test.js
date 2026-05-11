// Mock localStorage and window.electron before importing modules
globalThis.localStorage = {
    store: {},
    getItem(k) { return this.store[k] ?? null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    clear() { this.store = {}; },
};

import { describe, it, expect } from 'vitest';
import { serializeWorkspace, deserializeWorkspace } from '../src/services/workspace/serializer.js';

describe('workspace serialization', () => {
    it('round-trips a minimal V2 workspace', () => {
        const plotState = {
            plots: { p1: { id: 'p1', name: 'Plot 1', expressions: 'SPX', startDate: '', endDate: '', plotType: 'timeseries', seriesConfig: {} } },
            plotOrder: ['p1'],
            activePlotId: 'p1',
        };
        const appState = { rootPath: '/data' };
        const data = serializeWorkspace(plotState, appState);
        expect(data.version).toBe(2);
        const round = deserializeWorkspace(data);
        expect(round.rootPath).toBe('/data');
        expect(round.activePlotId).toBe('p1');
        expect(round.plots.p1.expressions).toBe('SPX');
    });

    it('migrates V1 → V2 by adding plotType', () => {
        const v1 = {
            version: 1,
            rootPath: '/data',
            activePlotId: 'p1',
            plotOrder: ['p1'],
            plots: { p1: { id: 'p1', name: 'Plot 1', expressions: 'SPX' } },
        };
        const result = deserializeWorkspace(v1);
        expect(result.plots.p1.plotType).toBe('timeseries');
    });

    it('throws on missing version field', () => {
        expect(() => deserializeWorkspace({ plots: {} })).toThrow(/Invalid workspace/);
    });

    it('rejects future workspace versions', () => {
        // Version 99 is newer than CURRENT_VERSION → must throw
        expect(() => deserializeWorkspace({ version: 99, plots: {} })).toThrow(/newer than supported/);
    });
});
