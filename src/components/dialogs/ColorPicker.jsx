import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';

const PRESET_COLORS = [
    '#0000FF', '#FF0000', '#008000', '#FF8C00', '#800080', '#008B8B',
    '#A0522D', '#4B0082', '#DC143C', '#006400', '#FF1493', '#1E90FF',
    '#FFD700', '#8B0000', '#00CED1', '#9400D3', '#FF6347', '#2E8B57',
    '#4169E1', '#FF4500', '#9370DB', '#3CB371', '#CD853F', '#6A5ACD',
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
];

export default function ColorPicker({ onSelect, onClose, currentColor }) {
    const [customColor, setCustomColor] = useState(currentColor || '#0000FF');

    const handleSelect = (color) => {
        onSelect(color);
        onClose();
    };

    return (
        <DialogBase title="Color" onClose={onClose} width={260} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={() => handleSelect(customColor)}>OK</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div className="color-grid">
                {PRESET_COLORS.map(color => (
                    <div
                        key={color}
                        className={`color-cell ${color === customColor ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setCustomColor(color)}
                        onDoubleClick={() => handleSelect(color)}
                        title={color}
                    />
                ))}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '11px' }}>Custom:</label>
                <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    style={{ width: '40px', height: '20px', border: 'none', padding: 0 }}
                />
                <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="expression-input"
                    style={{ width: '80px' }}
                />
            </div>
        </DialogBase>
    );
}
