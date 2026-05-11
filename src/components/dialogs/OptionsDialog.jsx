import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { useAppStore } from '../../store/appStore.js';
import { setStatsConfig } from '../../services/stats/config.js';
import { usePlotStore } from '../../store/plotStore.js';

function loadOptions() {
    try {
        const stored = localStorage.getItem('plottoolOptions');
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return {
        defaultRootPath: localStorage.getItem('lastRootPath') || 'C:\\Users\\haibi\\Python\\BBGDB',
        dateFormat: 'YYYY-MM-DD',
        decimals: 4,
        defaultLineWidth: 1.5,
        currencyCode: '',
        useSampleVariance: (() => {
            try {
                const v = localStorage.getItem('useSampleVariance');
                return v === null ? true : JSON.parse(v);
            } catch { return true; }
        })(),
        colorblindPalette: localStorage.getItem('colorblindPalette') === 'true',
    };
}

export default function OptionsDialog({ onClose }) {
    const [options, setOptions] = useState(loadOptions);

    const handleSave = () => {
        localStorage.setItem('plottoolOptions', JSON.stringify(options));
        localStorage.setItem('useSampleVariance', JSON.stringify(options.useSampleVariance));
        localStorage.setItem('colorblindPalette', String(options.colorblindPalette));
        if (options.defaultRootPath) {
            useAppStore.getState().setRootPath(options.defaultRootPath);
        }
        useAppStore.setState({
            useSampleVariance: options.useSampleVariance,
            decimals: options.decimals,
            currencyCode: options.currencyCode,
        });
        // Update live stats config so recomputes use the new setting immediately.
        setStatsConfig({ useSampleVariance: options.useSampleVariance });
        // Trigger a recalc so stats refresh
        usePlotStore.getState().requestEvaluation();
        onClose();
    };

    const update = (key, value) => setOptions(prev => ({ ...prev, [key]: value }));

    return (
        <DialogBase title="Options" onClose={onClose} width={380} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleSave}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Default Root Path:</label>
                    <input
                        className="expression-input"
                        style={{ flex: 1 }}
                        value={options.defaultRootPath}
                        onChange={(e) => update('defaultRootPath', e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Date Format:</label>
                    <select
                        value={options.dateFormat}
                        onChange={(e) => update('dateFormat', e.target.value)}
                        style={{ fontSize: '11px', flex: 1 }}
                    >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="dMMMYY">dMMMYY</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Decimal Places:</label>
                    <input
                        className="expression-input"
                        type="number"
                        min="0"
                        max="10"
                        style={{ width: '60px' }}
                        value={options.decimals}
                        onChange={(e) => update('decimals', parseInt(e.target.value) || 4)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Default Line Width:</label>
                    <input
                        className="expression-input"
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.5"
                        style={{ width: '60px' }}
                        value={options.defaultLineWidth}
                        onChange={(e) => update('defaultLineWidth', parseFloat(e.target.value) || 1.5)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Currency Code:</label>
                    <select
                        value={options.currencyCode}
                        onChange={(e) => update('currencyCode', e.target.value)}
                        style={{ fontSize: '11px', width: '120px' }}
                    >
                        <option value="">(none)</option>
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                        <option value="¥">JPY/CNY (¥)</option>
                        <option value="CHF ">CHF</option>
                        <option value="%">Percent (%)</option>
                    </select>
                    <span style={{ fontSize: '10px', color: '#666' }}>Y-axis label suffix</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Sample Variance:</label>
                    <input
                        type="checkbox"
                        checked={options.useSampleVariance}
                        onChange={(e) => update('useSampleVariance', e.target.checked)}
                    />
                    <span style={{ fontSize: '10px', color: '#666' }}>Use N-1 (Bessel's correction) for volatility</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', width: '100px' }}>Color Palette:</label>
                    <input
                        type="checkbox"
                        checked={options.colorblindPalette}
                        onChange={(e) => update('colorblindPalette', e.target.checked)}
                    />
                    <span style={{ fontSize: '10px', color: '#666' }}>Colorblind-friendly (Okabe-Ito)</span>
                </div>
            </div>
        </DialogBase>
    );
}
