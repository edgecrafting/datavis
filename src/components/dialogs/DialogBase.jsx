import React, { useEffect, useRef } from 'react';

export default function DialogBase({ title, onClose, children, width = 400, footer }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="dialog-overlay" onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="dialog-window" ref={dialogRef} style={{ width }}>
                <div className="dialog-titlebar">
                    <span className="dialog-title-text">{title}</span>
                    <button className="dialog-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="dialog-body">
                    {children}
                </div>
                {footer !== undefined ? footer : (
                    <div className="dialog-footer">
                        <button className="win-button" onClick={onClose}>OK</button>
                        <button className="win-button" onClick={onClose}>Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
}
