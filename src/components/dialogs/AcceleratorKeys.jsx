import React, { useState, useMemo } from 'react';
import DialogBase from './DialogBase.jsx';
import { commandRegistry } from '../../services/commands/registry.js';

const GROUP_LABELS = {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    insert: 'Insert',
    format: 'Format',
    tools: 'Tools',
    data: 'Data',
    window: 'Window',
    help: 'Help',
};

export default function AcceleratorKeys({ onClose }) {
    const [query, setQuery] = useState('');

    const grouped = useMemo(() => {
        const all = commandRegistry.list().filter(c => c.shortcut);
        const q = query.toLowerCase();
        const filtered = q
            ? all.filter(c =>
                c.label.toLowerCase().includes(q) ||
                c.shortcut.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q)
            )
            : all;
        const buckets = {};
        for (const cmd of filtered) {
            const group = cmd.group || 'other';
            if (!buckets[group]) buckets[group] = [];
            buckets[group].push(cmd);
        }
        for (const k of Object.keys(buckets)) {
            buckets[k].sort((a, b) => a.label.localeCompare(b.label));
        }
        return buckets;
    }, [query]);

    return (
        <DialogBase title="Accelerator Keys" onClose={onClose} width={460} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '6px' }}>
                <input
                    autoFocus
                    type="text"
                    className="expression-input"
                    placeholder="Search shortcuts..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: '100%', marginBottom: '6px' }}
                />
                <div className="data-viewer-scroll" style={{ maxHeight: '380px' }}>
                    {Object.keys(grouped).sort().map(group => (
                        <div key={group} style={{ marginBottom: '6px' }}>
                            <div style={{
                                fontWeight: 'bold', fontSize: '11px',
                                background: 'var(--bg-color)', padding: '2px 4px',
                                borderBottom: '1px solid var(--shadow)'
                            }}>
                                {GROUP_LABELS[group] || group}
                            </div>
                            <table className="data-viewer-table" style={{ width: '100%' }}>
                                <tbody>
                                    {grouped[group].map(cmd => (
                                        <tr key={cmd.id}>
                                            <td style={{ width: '60%' }}>{cmd.label}</td>
                                            <td style={{ fontFamily: 'Consolas, monospace', fontSize: '10px', textAlign: 'right', color: '#444' }}>
                                                {cmd.shortcut}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    {Object.keys(grouped).length === 0 && (
                        <div style={{ textAlign: 'center', color: '#888', padding: '12px', fontSize: '11px' }}>
                            No shortcuts match "{query}"
                        </div>
                    )}
                </div>
            </div>
        </DialogBase>
    );
}
