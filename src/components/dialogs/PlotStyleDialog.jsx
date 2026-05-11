import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { usePlotStore } from '../../store/plotStore.js';

const DEFAULTS = {
    fontFamily: 'Tahoma',
    fontSize: 10,
    titleSize: 14,
    marginLeft: 50,
    marginRight: 20,
    marginTop: 40,
    marginBottom: 30,
    plotBg: '#ffffff',
    paperBg: '#ffffff',
};

export default function PlotStyleDialog({ onClose, initialTab = 'fonts' }) {
    const activePlotId = usePlotStore(s => s.activePlotId);
    const existing = usePlotStore(s => s.plots[s.activePlotId]?.styleConfig) || {};
    const [tab, setTab] = useState(initialTab);
    const [config, setConfig] = useState(() => ({ ...DEFAULTS, ...existing }));

    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    const handleOK = () => {
        usePlotStore.getState().updatePlot(activePlotId, { styleConfig: config });
        usePlotStore.getState().requestEvaluation();
        onClose();
    };

    const handleReset = () => setConfig({ ...DEFAULTS });

    const row = (label, key, type = 'text', extra = {}) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', width: '110px' }}>{label}</label>
            <input
                type={type}
                className="expression-input"
                value={config[key]}
                onChange={(e) => {
                    const v = type === 'number' ? parseFloat(e.target.value) : e.target.value;
                    update(key, type === 'number' && isNaN(v) ? 0 : v);
                }}
                style={{ flex: 1 }}
                {...extra}
            />
        </div>
    );

    const tabBtn = (id, label) => (
        <button
            key={id}
            className={`win-button ${tab === id ? 'active-tab' : ''}`}
            onClick={() => setTab(id)}
            style={{
                height: '20px',
                padding: '0 10px',
                background: tab === id ? '#fff' : 'var(--bg-color)',
                borderBottomColor: tab === id ? '#fff' : 'var(--shadow)',
            }}
        >{label}</button>
    );

    return (
        <DialogBase title="Plot Style" onClose={onClose} width={380} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleReset}>Reset</button>
                <button className="win-button" onClick={handleOK}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '4px' }}>
                <div style={{ display: 'flex', gap: '0px', borderBottom: '1px solid var(--shadow)', marginBottom: '8px' }}>
                    {tabBtn('fonts', 'Fonts')}
                    {tabBtn('margins', 'Margins')}
                    {tabBtn('background', 'Background')}
                </div>

                {tab === 'fonts' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <label style={{ fontSize: '11px', width: '110px' }}>Font family</label>
                            <select
                                value={config.fontFamily}
                                onChange={(e) => update('fontFamily', e.target.value)}
                                style={{ flex: 1, fontSize: '11px' }}
                            >
                                <option>Tahoma</option>
                                <option>Arial</option>
                                <option>Helvetica</option>
                                <option>Segoe UI</option>
                                <option>Consolas</option>
                                <option>Courier New</option>
                                <option>Verdana</option>
                                <option>Georgia</option>
                            </select>
                        </div>
                        {row('Axis font size', 'fontSize', 'number', { min: 6, max: 20, step: 1 })}
                        {row('Title font size', 'titleSize', 'number', { min: 8, max: 30, step: 1 })}
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                            Affects axis ticks, legend, and chart title.
                        </div>
                    </div>
                )}

                {tab === 'margins' && (
                    <div>
                        {row('Left (px)', 'marginLeft', 'number', { min: 0, max: 200 })}
                        {row('Right (px)', 'marginRight', 'number', { min: 0, max: 200 })}
                        {row('Top (px)', 'marginTop', 'number', { min: 0, max: 200 })}
                        {row('Bottom (px)', 'marginBottom', 'number', { min: 0, max: 200 })}
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                            Increase top/right for legend and y2 axis labels.
                        </div>
                    </div>
                )}

                {tab === 'background' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <label style={{ fontSize: '11px', width: '110px' }}>Plot area</label>
                            <input type="color" value={config.plotBg} onChange={(e) => update('plotBg', e.target.value)} />
                            <input type="text" className="expression-input" value={config.plotBg} onChange={(e) => update('plotBg', e.target.value)} style={{ flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <label style={{ fontSize: '11px', width: '110px' }}>Surrounding</label>
                            <input type="color" value={config.paperBg} onChange={(e) => update('paperBg', e.target.value)} />
                            <input type="text" className="expression-input" value={config.paperBg} onChange={(e) => update('paperBg', e.target.value)} style={{ flex: 1 }} />
                        </div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                            Plot area is inside the axes; surrounding is the outer panel.
                        </div>
                    </div>
                )}
            </div>
        </DialogBase>
    );
}
