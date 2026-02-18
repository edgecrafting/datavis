import React from 'react';
import DialogBase from './DialogBase.jsx';
import { useDataStore } from '../../store/dataStore.js';

function fmt(val, pct = false) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (pct) return (val * 100).toFixed(2) + '%';
    return val.toFixed(4);
}

export default function VitalStats({ onClose }) {
    const { seriesMap } = useDataStore();
    const keys = Object.keys(seriesMap);

    return (
        <DialogBase title="Vital Stats" onClose={onClose} width={650} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={() => {
                    let text = 'Name\tAR\tVol\tSharpe\tMaxDD\tMinR1\tMaxR1\tPoints\tStart\tEnd\n';
                    keys.forEach(key => {
                        const s = seriesMap[key];
                        const st = s.stats || {};
                        text += `${s.name}\t${fmt(st.ar, true)}\t${fmt(st.vol, true)}\t${fmt(st.sharpe)}\t${fmt(st.maxDD, true)}\t${fmt(st.minR1, true)}\t${fmt(st.maxR1, true)}\t${s.dates?.length || 0}\t${s.dates?.[0] || ''}\t${s.dates?.[s.dates.length - 1] || ''}\n`;
                    });
                    navigator.clipboard.writeText(text);
                }}>Copy</button>
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            {keys.length === 0 ? (
                <p style={{ padding: '8px', fontSize: '11px' }}>No data loaded.</p>
            ) : (
                <div className="data-viewer-scroll">
                    <table className="data-viewer-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>AR</th>
                                <th>Vol</th>
                                <th>Sharpe</th>
                                <th>MaxDD</th>
                                <th>MinR1</th>
                                <th>MaxR1</th>
                                <th>Points</th>
                                <th>Start</th>
                                <th>End</th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map(key => {
                                const s = seriesMap[key];
                                const st = s.stats || {};
                                return (
                                    <tr key={key}>
                                        <td title={key}>{s.name}</td>
                                        <td>{fmt(st.ar, true)}</td>
                                        <td>{fmt(st.vol, true)}</td>
                                        <td>{fmt(st.sharpe)}</td>
                                        <td>{fmt(st.maxDD, true)}</td>
                                        <td>{fmt(st.minR1, true)}</td>
                                        <td>{fmt(st.maxR1, true)}</td>
                                        <td>{s.dates?.length || 0}</td>
                                        <td>{s.dates?.[0] || '-'}</td>
                                        <td>{s.dates?.[s.dates.length - 1] || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </DialogBase>
    );
}
