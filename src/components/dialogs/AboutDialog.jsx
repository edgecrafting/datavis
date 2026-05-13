import React from 'react';
import DialogBase from './DialogBase.jsx';

// Injected by Vite from package.json at build time.
/* global __APP_VERSION__, __APP_DEPS__ */
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const DEPS = typeof __APP_DEPS__ !== 'undefined' ? __APP_DEPS__ : {};

export default function AboutDialog({ onClose }) {
    const cleanVer = (v) => (v || '').replace(/^[\^~]/, '');

    return (
        <DialogBase title="About DataVisual" onClose={onClose} width={380} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={onClose}>OK</button>
            </div>
        }>
            <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px', color: '#1a4f8b' }}>
                    DataVisual
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
                    Version {VERSION}
                </div>
                <div style={{ fontSize: '11px', marginBottom: '12px' }}>
                    Financial Time Series Visualization
                </div>

                <div style={{
                    fontSize: '10px', color: '#444', lineHeight: '1.6',
                    background: '#f8f8f8', padding: '8px', textAlign: 'left',
                    border: '1px solid #ddd', borderRadius: '2px',
                    fontFamily: 'Consolas, monospace',
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1a4f8b' }}>Dependencies</div>
                    {Object.entries(DEPS).map(([name, version]) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{name}</span>
                            <span style={{ color: '#888' }}>{cleanVer(version)}</span>
                        </div>
                    ))}
                </div>

                <div style={{ fontSize: '10px', color: '#666', marginTop: '12px', lineHeight: '1.6' }}>
                    MIT License<br />
                    Bloomberg-style data viewer<br />
                    Windows 2000 retro aesthetic
                </div>

                <div style={{ fontSize: '10px', color: '#888', marginTop: '8px' }}>
                    See <code>docs/expression-language.md</code> for the expression reference.
                </div>
            </div>
        </DialogBase>
    );
}
