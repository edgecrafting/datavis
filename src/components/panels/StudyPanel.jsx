import React, { useState, useEffect } from 'react';
import DialogBase from '../dialogs/DialogBase.jsx';
import { getStudies, addStudy, removeStudy, applyStudyTemplate } from '../../services/study/engine.js';
import { useDataStore } from '../../store/dataStore.js';
import { usePlotStore } from '../../store/plotStore.js';

export default function StudyPanel({ onClose }) {
    const [studies, setStudies] = useState([]);
    const [newName, setNewName] = useState('');
    const [newTemplate, setNewTemplate] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [selected, setSelected] = useState(null);
    const seriesKeys = Object.keys(useDataStore.getState().seriesMap);

    useEffect(() => {
        setStudies(getStudies());
    }, []);

    const handleAdd = () => {
        if (newName.trim() && newTemplate.trim()) {
            const result = addStudy({
                name: newName.trim(),
                template: newTemplate.trim(),
                description: newDesc.trim()
            });
            setStudies(result);
            setNewName('');
            setNewTemplate('');
            setNewDesc('');
        }
    };

    const handleRemove = (name) => {
        const result = removeStudy(name);
        setStudies(result);
    };

    const handleApply = () => {
        if (!selected) return;
        const study = studies.find(s => s.name === selected);
        if (!study) return;

        const expr = applyStudyTemplate(study.template, seriesKeys);
        usePlotStore.getState().insertText(expr);
        onClose();
    };

    return (
        <DialogBase title="Study / Slang Examples" onClose={onClose} width={500} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleApply} disabled={!selected}>Apply</button>
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '4px' }}>
                <div className="data-viewer-scroll" style={{ maxHeight: '200px', marginBottom: '8px' }}>
                    <table className="data-viewer-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Template</th>
                                <th>Description</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {studies.map((s, i) => (
                                <tr
                                    key={i}
                                    className={selected === s.name ? 'selected-row' : ''}
                                    onClick={() => setSelected(s.name)}
                                    onDoubleClick={() => { setSelected(s.name); handleApply(); }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td><strong>{s.name}</strong></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '10px' }}>{s.template}</td>
                                    <td>{s.description}</td>
                                    <td>
                                        <button className="win-button" onClick={(e) => { e.stopPropagation(); handleRemove(s.name); }} style={{ padding: '0 4px', height: '16px', fontSize: '10px' }}>X</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ borderTop: '1px solid #999', paddingTop: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Add Study:</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        <input className="expression-input" style={{ width: '80px' }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
                        <input className="expression-input" style={{ flex: 1 }} value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} placeholder="Template (e.g. ma($1, 20))" />
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <input className="expression-input" style={{ flex: 1 }} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" />
                        <button className="win-button" onClick={handleAdd}>Add</button>
                    </div>
                </div>
            </div>
        </DialogBase>
    );
}
