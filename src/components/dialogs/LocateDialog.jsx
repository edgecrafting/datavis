import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { useDataStore } from '../../store/dataStore.js';
import { useAppStore } from '../../store/appStore.js';

export default function LocateDialog({ onClose }) {
    const seriesMap = useDataStore(s => s.seriesMap);
    const spotlight = useAppStore(s => s.spotlightSeries);
    const [query, setQuery] = useState('');
    const keys = Object.keys(seriesMap);
    const q = query.toLowerCase();
    const filtered = q ? keys.filter(k => k.toLowerCase().includes(q)) : keys;

    const apply = (key) => {
        useAppStore.setState({ spotlightSeries: key });
    };

    const clear = () => {
        useAppStore.setState({ spotlightSeries: null });
    };

    if (keys.length === 0) {
        return (
            <DialogBase title="Locate Series" onClose={onClose} width={400} footer={
                <div className="dialog-footer"><button className="win-button" onClick={onClose}>Close</button></div>
            }>
                <div style={{ padding: '12px', textAlign: 'center', color: '#888', fontSize: '11px' }}>
                    No series on the chart. Press F9 to evaluate an expression first.
                </div>
            </DialogBase>
        );
    }

    return (
        <DialogBase title="Locate Series (Spotlight)" onClose={onClose} width={420} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={() => { clear(); onClose(); }}>Clear Spotlight</button>
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '6px' }}>
                <input
                    autoFocus
                    type="text"
                    className="expression-input"
                    placeholder="Filter series..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: '100%', marginBottom: '6px' }}
                />
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                    Click to spotlight. Other series will dim until cleared.
                </div>
                <div className="data-viewer-scroll" style={{ maxHeight: '280px' }}>
                    <table className="data-viewer-table">
                        <tbody>
                            {filtered.map(key => {
                                const series = seriesMap[key];
                                const color = series.color || '#888';
                                const isActive = spotlight === key;
                                return (
                                    <tr
                                        key={key}
                                        className={isActive ? 'selected-row' : ''}
                                        onClick={() => apply(key)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={{ width: '16px' }}>
                                            <span className="stats-swatch" style={{ backgroundColor: color }} />
                                        </td>
                                        <td>{series.name || key}</td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={2} style={{ textAlign: 'center', color: '#999', padding: '8px' }}>No matches</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DialogBase>
    );
}
