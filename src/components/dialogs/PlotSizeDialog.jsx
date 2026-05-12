import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { useAppStore } from '../../store/appStore.js';

const PRESETS = [
    { label: 'Auto (fill panel)', width: null, height: null },
    { label: '720p (1280x720)', width: 1280, height: 720 },
    { label: '1080p (1920x1080)', width: 1920, height: 1080 },
    { label: '4K (3840x2160)', width: 3840, height: 2160 },
    { label: 'Square (800x800)', width: 800, height: 800 },
    { label: 'Letter landscape (1100x850)', width: 1100, height: 850 },
    { label: 'Letter portrait (850x1100)', width: 850, height: 1100 },
    { label: 'Wide (2400x800)', width: 2400, height: 800 },
];

export default function PlotSizeDialog({ onClose }) {
    const current = useAppStore(s => s.chartSize);
    const [width, setWidth] = useState(current?.width ?? '');
    const [height, setHeight] = useState(current?.height ?? '');

    const apply = (w, h) => {
        if (w == null || h == null || w === '' || h === '') {
            useAppStore.setState({ chartSize: null });
        } else {
            useAppStore.setState({ chartSize: { width: Number(w), height: Number(h) } });
        }
    };

    const handleOK = () => {
        apply(width, height);
        onClose();
    };

    const handleReset = () => {
        setWidth(''); setHeight('');
        apply(null, null);
    };

    return (
        <DialogBase title="Change Plot Size" onClose={onClose} width={360} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleReset}>Auto Size</button>
                <button className="win-button" onClick={handleOK}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div style={{ padding: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>Presets</div>
                <div className="data-viewer-scroll" style={{ maxHeight: '180px', marginBottom: '8px' }}>
                    <table className="data-viewer-table">
                        <tbody>
                            {PRESETS.map((p, i) => (
                                <tr
                                    key={i}
                                    onClick={() => { setWidth(p.width ?? ''); setHeight(p.height ?? ''); }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{p.label}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', width: '60px' }}>Width</label>
                    <input
                        type="number" min="100" max="8000"
                        className="expression-input"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        style={{ flex: 1 }}
                        placeholder="auto"
                    />
                    <span style={{ fontSize: '10px', color: '#666' }}>px</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', width: '60px' }}>Height</label>
                    <input
                        type="number" min="100" max="8000"
                        className="expression-input"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        style={{ flex: 1 }}
                        placeholder="auto"
                    />
                    <span style={{ fontSize: '10px', color: '#666' }}>px</span>
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                    Fixed sizes scroll within the chart panel. Use "Auto Size" to fit the panel.
                </div>
            </div>
        </DialogBase>
    );
}
