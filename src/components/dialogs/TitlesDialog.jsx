import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';

export default function TitlesDialog({ onClose }) {
    const activePlotId = usePlotStore(s => s.activePlotId);
    const initialTitles = usePlotStore(s => s.plots[s.activePlotId]?.titles) || {};
    const initialPlotTitle = useAppStore(s => s.plotTitle);

    const [config, setConfig] = useState(() => ({
        chartTitle: initialPlotTitle || initialTitles.chartTitle || '',
        xAxis: initialTitles.xAxis || '',
        yAxis: initialTitles.yAxis || '',
        y2Axis: initialTitles.y2Axis || '',
    }));

    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    const handleOK = () => {
        useAppStore.setState({ plotTitle: config.chartTitle });
        usePlotStore.getState().updatePlot(activePlotId, { titles: config });
        usePlotStore.getState().requestEvaluation();
        onClose();
    };

    const field = (label, key) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', width: '100px' }}>{label}</label>
            <input
                type="text"
                className="expression-input"
                value={config[key]}
                onChange={(e) => update(key, e.target.value)}
                style={{ flex: 1 }}
            />
        </div>
    );

    return (
        <DialogBase title="Titles" onClose={onClose} width={400} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleOK}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '6px' }}>
                {field('Chart title', 'chartTitle')}
                {field('X-axis label', 'xAxis')}
                {field('Y-axis label', 'yAxis')}
                {field('Y2-axis label', 'y2Axis')}
            </div>
        </DialogBase>
    );
}
