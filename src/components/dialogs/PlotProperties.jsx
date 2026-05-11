import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { usePlotStore } from '../../store/plotStore.js';
import { useDataStore } from '../../store/dataStore.js';

export default function PlotProperties({ onClose }) {
    const activePlot = usePlotStore(s => s.plots[s.activePlotId]);
    const seriesMap = useDataStore(s => s.seriesMap);
    const cacheSize = Object.keys(useDataStore.getState().seriesCache || {}).length;
    const [name, setName] = useState(activePlot?.name || '');

    if (!activePlot) return null;

    const expressionLines = (activePlot.expressions || '').split('\n').filter(l => l.trim()).length;
    const seriesNames = Object.keys(seriesMap);
    const totalPoints = seriesNames.reduce((sum, n) => sum + (seriesMap[n].values?.length || 0), 0);

    // Global date range across all displayed series
    let minDate = null, maxDate = null;
    for (const n of seriesNames) {
        const s = seriesMap[n];
        if (s.dates?.length) {
            const first = s.dates[0];
            const last = s.dates[s.dates.length - 1];
            if (!minDate || first < minDate) minDate = first;
            if (!maxDate || last > maxDate) maxDate = last;
        }
    }

    const handleSave = () => {
        if (name.trim() && name !== activePlot.name) {
            usePlotStore.getState().renamePlot(activePlot.id, name.trim());
        }
        onClose();
    };

    const stat = (label, value) => (
        <div style={{ display: 'flex', fontSize: '11px', padding: '2px 0' }}>
            <div style={{ width: '140px', color: '#666' }}>{label}</div>
            <div style={{ flex: 1, fontFamily: 'Consolas, monospace' }}>{value}</div>
        </div>
    );

    return (
        <DialogBase title="Plot Properties" onClose={onClose} width={400} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleSave}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', width: '90px' }}>Plot name</label>
                    <input
                        type="text"
                        className="expression-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ flex: 1 }}
                        autoFocus
                    />
                </div>

                <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Active plot</div>
                    {stat('Plot ID', activePlot.id)}
                    {stat('Expression lines', expressionLines)}
                    {stat('Plot type', activePlot.plotType || 'timeseries')}
                    {stat('Series shown', seriesNames.length)}
                    {stat('Annotations', (activePlot.annotations || []).length)}
                </div>

                <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Data summary</div>
                    {stat('Total points (visible)', totalPoints.toLocaleString())}
                    {stat('Date range', minDate ? `${minDate} → ${maxDate}` : '(no data)')}
                    {stat('Cached series (session)', cacheSize)}
                </div>

                <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Style</div>
                    {stat('Y-axis log scale', activePlot.axisConfig?.yLog ? 'yes' : 'no')}
                    {stat('Font family', activePlot.styleConfig?.fontFamily || 'Tahoma')}
                    {stat('Series order locked', (activePlot.seriesOrder || []).length > 0 ? 'yes' : 'no')}
                </div>
            </div>
        </DialogBase>
    );
}
