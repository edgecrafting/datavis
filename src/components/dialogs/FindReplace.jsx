import React, { useState, useEffect, useRef } from 'react';
import DialogBase from './DialogBase.jsx';
import { usePlotStore } from '../../store/plotStore.js';

export default function FindReplace({ onClose }) {
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchIndex, setMatchIndex] = useState(-1);
    const findRef = useRef(null);

    useEffect(() => {
        findRef.current?.focus();
    }, []);

    const getExpression = () => {
        const plot = usePlotStore.getState().getActivePlot();
        return plot?.expressions || '';
    };

    const setExpression = (text) => {
        const id = usePlotStore.getState().activePlotId;
        if (id) usePlotStore.getState().updatePlot(id, { expressions: text });
    };

    const handleFind = () => {
        if (!findText) return;
        const text = getExpression();
        const searchFrom = matchIndex >= 0 ? matchIndex + findText.length : 0;
        let idx = text.indexOf(findText, searchFrom);
        if (idx < 0) idx = text.indexOf(findText); // wrap around
        setMatchIndex(idx);
    };

    const handleReplace = () => {
        if (!findText || matchIndex < 0) return;
        const text = getExpression();
        const before = text.substring(0, matchIndex);
        const after = text.substring(matchIndex + findText.length);
        setExpression(before + replaceText + after);
        setMatchIndex(-1);
        handleFind();
    };

    const handleReplaceAll = () => {
        if (!findText) return;
        const text = getExpression();
        setExpression(text.split(findText).join(replaceText));
        setMatchIndex(-1);
    };

    return (
        <DialogBase title="Find and Replace" onClose={onClose} width={340} footer={null}>
            <div style={{ padding: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <label style={{ fontSize: '11px', width: '55px' }}>Find:</label>
                    <input
                        ref={findRef}
                        className="expression-input"
                        style={{ flex: 1 }}
                        value={findText}
                        onChange={(e) => setFindText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleFind(); }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', width: '55px' }}>Replace:</label>
                    <input
                        className="expression-input"
                        style={{ flex: 1 }}
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReplace(); }}
                    />
                </div>
                {matchIndex >= 0 && (
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                        Found at position {matchIndex}
                    </div>
                )}
                {matchIndex < 0 && findText && (
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                        Not found
                    </div>
                )}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button className="win-button" onClick={handleFind}>Find Next</button>
                    <button className="win-button" onClick={handleReplace}>Replace</button>
                    <button className="win-button" onClick={handleReplaceAll}>Replace All</button>
                    <button className="win-button" onClick={onClose}>Close</button>
                </div>
            </div>
        </DialogBase>
    );
}
