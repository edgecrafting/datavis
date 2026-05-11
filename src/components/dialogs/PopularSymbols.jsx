import React, { useState, useMemo } from 'react';
import DialogBase from './DialogBase.jsx';
import { getTopSymbols, clearUsage } from '../../services/usage/tracker.js';
import { usePlotStore } from '../../store/plotStore.js';

function formatAgo(ts) {
    if (!ts) return '';
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
}

export default function PopularSymbols({ onClose }) {
    const [refreshKey, setRefreshKey] = useState(0);
    // refreshKey is read for its mutation effect (forces recompute after clear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const top = useMemo(() => getTopSymbols(50), [refreshKey]);

    const insert = (name) => {
        usePlotStore.getState().insertText(name);
        onClose();
    };

    const handleClear = () => {
        if (confirm('Clear all usage history?')) {
            clearUsage();
            setRefreshKey(k => k + 1);
        }
    };

    return (
        <DialogBase title="Most Popular Symbols" onClose={onClose} width={480} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleClear} disabled={top.length === 0}>Clear History</button>
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '4px' }}>
                {top.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '11px' }}>
                        No usage data yet. Reference some series in expressions and they'll appear here.
                    </div>
                ) : (
                    <div className="data-viewer-scroll" style={{ maxHeight: '380px' }}>
                        <table className="data-viewer-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '32px' }}>#</th>
                                    <th>Symbol</th>
                                    <th style={{ width: '50px', textAlign: 'right' }}>Uses</th>
                                    <th style={{ width: '70px' }}>Last</th>
                                </tr>
                            </thead>
                            <tbody>
                                {top.map((s, i) => (
                                    <tr
                                        key={s.name}
                                        onDoubleClick={() => insert(s.name)}
                                        style={{ cursor: 'pointer' }}
                                        title="Double-click to insert into active plot"
                                    >
                                        <td style={{ color: '#888' }}>{i + 1}</td>
                                        <td><strong>{s.name}</strong></td>
                                        <td style={{ textAlign: 'right', fontFamily: 'Consolas, monospace' }}>{s.count}</td>
                                        <td style={{ fontSize: '10px', color: '#666' }}>{formatAgo(s.lastUsed)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DialogBase>
    );
}
