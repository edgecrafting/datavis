import React from 'react';
import DialogBase from './DialogBase.jsx';

export default function AboutDialog({ onClose }) {
    return (
        <DialogBase title="About PlotTool" onClose={onClose} width={320} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={onClose}>OK</button>
            </div>
        }>
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                    PlotTool
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
                    Version 1.0.0
                </div>
                <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                    Financial Time Series Visualization
                </div>
                <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.6' }}>
                    React 19 + Vite 7 + Electron 40<br />
                    Plotly.js + Zustand + PapaParse<br />
                    <br />
                    Windows 2000 Retro UI
                </div>
            </div>
        </DialogBase>
    );
}
