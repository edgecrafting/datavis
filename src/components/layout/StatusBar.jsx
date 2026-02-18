import React from 'react';
import { useAppStore } from '../../store/appStore.js';
import { useDataStore } from '../../store/dataStore.js';

function formatHoverDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}${mon}${year}`;
}

function formatHoverValue(val) {
    if (val === null || val === undefined) return '';
    return typeof val === 'number' ? val.toFixed(4) : String(val);
}

export default function StatusBar() {
    const statusMessage = useAppStore(s => s.statusMessage);
    const hoverDate = useAppStore(s => s.hoverDate);
    const hoverValue = useAppStore(s => s.hoverValue);
    const seriesCount = useDataStore(s => Object.keys(s.seriesMap).length);

    return (
        <div className="status-bar">
            <div className="status-segment flex">{statusMessage || 'For Help, press F1'}</div>
            <div className="status-segment" style={{ width: '60px' }}>Lines {seriesCount}</div>
            <div className="status-segment" style={{ width: '80px' }}>{formatHoverDate(hoverDate)}</div>
            <div className="status-segment" style={{ width: '100px' }}>{formatHoverValue(hoverValue)}</div>
            <div className="status-segment" style={{ width: '80px' }}>Local Mode</div>
            <div className="status-segment" style={{ width: '100px' }}>Display Settings</div>
        </div>
    );
}
