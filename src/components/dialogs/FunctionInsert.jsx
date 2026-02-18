import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';
import { registry } from '../../services/functions/registry.js';
import { usePlotStore } from '../../store/plotStore.js';

export default function FunctionInsert({ onClose }) {
    const [selected, setSelected] = useState(null);
    const functions = registry.list().map(name => {
        const entry = registry.functions[name];
        return { name, description: entry?.description || '' };
    });

    const handleInsert = () => {
        if (!selected) return;
        usePlotStore.getState().insertText(`${selected}()`);
        onClose();
    };

    return (
        <DialogBase title="Insert Function" onClose={onClose} width={350} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleInsert} disabled={!selected}>Insert</button>
                <button className="win-button" onClick={onClose}>Cancel</button>
            </div>
        }>
            <div className="data-viewer-scroll" style={{ maxHeight: '250px' }}>
                <table className="data-viewer-table">
                    <thead>
                        <tr>
                            <th>Function</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {functions.map(f => (
                            <tr
                                key={f.name}
                                className={selected === f.name ? 'selected-row' : ''}
                                onClick={() => setSelected(f.name)}
                                onDoubleClick={() => { setSelected(f.name); handleInsert(); }}
                                style={{ cursor: 'pointer' }}
                            >
                                <td><strong>{f.name}</strong></td>
                                <td>{f.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DialogBase>
    );
}
