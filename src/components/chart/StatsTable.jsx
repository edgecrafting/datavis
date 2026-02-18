import React from 'react';
import { useDataStore } from '../../store/dataStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';

function formatPct(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return (val * 100).toFixed(1) + '%';
}

function formatNum(val, decimals = 4) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return val.toFixed(decimals);
}

export default function StatsTable() {
    const { seriesMap } = useDataStore();
    const keys = Object.keys(seriesMap);

    if (keys.length === 0) return null;

    return (
        <div className="stats-table-container">
            <table className="stats-table">
                <thead>
                    <tr>
                        <th className="stats-header" style={{ width: '14px' }}></th>
                        <th className="stats-header stats-name">Name</th>
                        <th className="stats-header">AR</th>
                        <th className="stats-header">Vol</th>
                        <th className="stats-header">Sharpe</th>
                        <th className="stats-header">MaxDD</th>
                        <th className="stats-header">MinR1</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map((key, index) => {
                        const series = seriesMap[key];
                        const stats = series.stats || {};
                        const color = series.color || getSeriesColor(index);
                        const config = series.config || {};

                        if (config.hidden) return null;

                        return (
                            <tr key={key} className={`stats-row ${config.disabled ? 'disabled' : ''}`}>
                                <td className="stats-cell">
                                    <span className="stats-swatch" style={{ backgroundColor: color }} />
                                </td>
                                <td className="stats-cell stats-name" title={key}>{series.name || key}</td>
                                <td className="stats-cell">{formatPct(stats.ar)}</td>
                                <td className="stats-cell">{formatPct(stats.vol)}</td>
                                <td className="stats-cell">{formatNum(stats.sharpe, 2)}</td>
                                <td className="stats-cell">{formatPct(stats.maxDD)}</td>
                                <td className="stats-cell">{formatPct(stats.minR1)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
