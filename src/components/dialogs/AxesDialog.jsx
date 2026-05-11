import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { usePlotStore } from '../../store/plotStore.js';

export default function AxesDialog({ onClose }) {
    const activePlotId = usePlotStore(s => s.activePlotId);
    const initial = usePlotStore(s => s.plots[s.activePlotId]?.axisConfig) || {};
    const [config, setConfig] = useState(() => ({
        yLog: !!initial.yLog,
        y2Log: !!initial.y2Log,
        yMin: initial.yMin ?? '',
        yMax: initial.yMax ?? '',
        y2Min: initial.y2Min ?? '',
        y2Max: initial.y2Max ?? '',
        yDtick: initial.yDtick ?? '',
        xType: initial.xType ?? 'date',
    }));

    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    const handleOK = () => {
        usePlotStore.getState().updatePlot(activePlotId, { axisConfig: config });
        // Trigger re-render so ChartView picks up the new layout
        usePlotStore.getState().requestEvaluation();
        onClose();
    };

    const fieldRow = (label, key, type = 'text', extra = {}) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', width: '110px' }}>{label}</label>
            <input
                type={type}
                className="expression-input"
                value={config[key]}
                onChange={(e) => update(key, e.target.value)}
                style={{ flex: 1 }}
                {...extra}
            />
        </div>
    );

    const checkRow = (label, key) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', width: '110px' }}>{label}</label>
            <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => update(key, e.target.checked)}
            />
        </div>
    );

    return (
        <DialogBase title="Axes" onClose={onClose} width={340} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleOK}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Y axis (left)</div>
                {checkRow('Logarithmic', 'yLog')}
                {fieldRow('Min', 'yMin', 'text', { placeholder: 'auto' })}
                {fieldRow('Max', 'yMax', 'text', { placeholder: 'auto' })}
                {fieldRow('Tick interval', 'yDtick', 'text', { placeholder: 'auto' })}

                <div style={{ fontWeight: 'bold', fontSize: '11px', marginTop: '8px', marginBottom: '4px' }}>Y2 axis (right)</div>
                {checkRow('Logarithmic', 'y2Log')}
                {fieldRow('Min', 'y2Min', 'text', { placeholder: 'auto' })}
                {fieldRow('Max', 'y2Max', 'text', { placeholder: 'auto' })}

                <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                    Leave blank for auto-range. Log scale requires positive values.
                </div>
            </div>
        </DialogBase>
    );
}
