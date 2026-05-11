import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { useDataStore } from '../../store/dataStore.js';
import { usePlotStore } from '../../store/plotStore.js';
import { useAppStore } from '../../store/appStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';

export default function SeriesProperties({ seriesKey, onClose }) {
    const series = useDataStore(s => s.seriesMap[seriesKey]);
    const existingConfig = series?.config || {};
    const [config, setConfig] = useState(() => ({
        color: series?.color || getSeriesColor(0),
        lineWidth: existingConfig.lineWidth ?? 1.5,
        lineStyle: existingConfig.lineStyle || 'solid',
        onRight: !!existingConfig.onRight,
        hidden: !!existingConfig.hidden,
        disabled: !!existingConfig.disabled,
    }));

    if (!series) {
        return (
            <DialogBase title="Series Properties" onClose={onClose} width={360} footer={
                <div className="dialog-footer"><button className="win-button" onClick={onClose}>Close</button></div>
            }>
                <div style={{ padding: '12px' }}>Series not found.</div>
            </DialogBase>
        );
    }

    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    const handleOK = () => {
        usePlotStore.getState().setSeriesConfig(seriesKey, config);
        usePlotStore.getState().requestEvaluation();
        useAppStore.setState({ statusMessage: `Updated: ${seriesKey}` });
        onClose();
    };

    return (
        <DialogBase title="Series Properties" onClose={onClose} width={360} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleOK}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px', wordBreak: 'break-all' }}>
                    {series.name || seriesKey}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', width: '90px' }}>Color</label>
                    <input type="color" value={config.color} onChange={(e) => update('color', e.target.value)} />
                    <input
                        type="text"
                        className="expression-input"
                        value={config.color}
                        onChange={(e) => update('color', e.target.value)}
                        style={{ flex: 1 }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', width: '90px' }}>Line width</label>
                    <input
                        type="range"
                        min="0.5" max="5" step="0.5"
                        value={config.lineWidth}
                        onChange={(e) => update('lineWidth', parseFloat(e.target.value))}
                        style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '11px', width: '32px', textAlign: 'right' }}>{config.lineWidth}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', width: '90px' }}>Line style</label>
                    <select
                        value={config.lineStyle}
                        onChange={(e) => update('lineStyle', e.target.value)}
                        style={{ flex: 1, fontSize: '11px' }}
                    >
                        <option value="solid">Solid</option>
                        <option value="dash">Dashed</option>
                        <option value="dot">Dotted</option>
                        <option value="dashdot">Dash-dot</option>
                    </select>
                </div>

                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                        <input type="checkbox" checked={config.onRight} onChange={(e) => update('onRight', e.target.checked)} />
                        On right axis
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                        <input type="checkbox" checked={config.hidden} onChange={(e) => update('hidden', e.target.checked)} />
                        Hidden
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                        <input type="checkbox" checked={config.disabled} onChange={(e) => update('disabled', e.target.checked)} />
                        Disabled (greyed in stats table)
                    </label>
                </div>

                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#666' }}>
                    <div>Path: {series.path || '(computed)'}</div>
                    <div>Points: {series.values?.length || 0}</div>
                    <div>Range: {series.dates?.[0] || '-'} → {series.dates?.[series.dates.length - 1] || '-'}</div>
                </div>
            </div>
        </DialogBase>
    );
}
