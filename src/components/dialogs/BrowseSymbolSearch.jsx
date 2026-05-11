import React, { useState, useEffect, useRef, useMemo } from 'react';
import DialogBase from './DialogBase.jsx';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';

// Module-level cache so re-opening the dialog doesn't re-scan.
let cachedIndex = null;
let cachedRoot = null;

function scoreMatch(name, tokens) {
    const lower = name.toLowerCase();
    let total = 0;
    for (const t of tokens) {
        const idx = lower.indexOf(t);
        if (idx < 0) return -1;
        total += 1 / (1 + idx);
    }
    return total;
}

export default function BrowseSymbolSearch({ onClose }) {
    const rootPath = useAppStore(s => s.rootPath);
    const [files, setFiles] = useState(cachedIndex && cachedRoot === rootPath ? cachedIndex : null);
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [scanning, setScanning] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        if (!files) {
            const scan = async () => {
                setScanning(true);
                try {
                    const result = await window.electron?.fs?.scanFolder(rootPath);
                    cachedIndex = result || [];
                    cachedRoot = rootPath;
                    setFiles(cachedIndex);
                } catch {
                    setFiles([]);
                } finally {
                    setScanning(false);
                }
            };
            scan();
        }
    }, [rootPath, files]);

    const results = useMemo(() => {
        if (!files || files.length === 0) return [];
        const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return files.slice(0, 200);
        const scored = [];
        for (const f of files) {
            const s = scoreMatch(f.name, tokens);
            if (s > 0) scored.push({ ...f, score: s });
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 200);
    }, [files, query]);

    useEffect(() => { setSelectedIdx(0); }, [query]);

    const insertSelected = (file) => {
        const display = file.name.toLowerCase().endsWith('.csv') ? file.name.slice(0, -4) : file.name;
        usePlotStore.getState().insertText(display);
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIdx]) insertSelected(results[selectedIdx]);
        }
    };

    const handleRescan = async () => {
        setScanning(true);
        cachedIndex = null;
        try {
            const result = await window.electron?.fs?.scanFolder(rootPath);
            cachedIndex = result || [];
            cachedRoot = rootPath;
            setFiles(cachedIndex);
        } finally {
            setScanning(false);
        }
    };

    return (
        <DialogBase title="Browse Symbol Search" onClose={onClose} width={520} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={handleRescan} disabled={scanning}>
                    {scanning ? 'Scanning…' : 'Rescan'}
                </button>
                <button
                    className="win-button"
                    onClick={() => results[selectedIdx] && insertSelected(results[selectedIdx])}
                    disabled={results.length === 0}
                >Insert</button>
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '4px' }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="expression-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={scanning ? 'Scanning...' : `Search ${files?.length || 0} symbols (space-separated tokens, ↑↓ Enter)`}
                    style={{ width: '100%', marginBottom: '4px' }}
                />
                <div className="data-viewer-scroll" style={{ maxHeight: '320px' }}>
                    <table className="data-viewer-table">
                        <thead>
                            <tr><th>Name</th><th>Path</th></tr>
                        </thead>
                        <tbody>
                            {results.map((f, i) => (
                                <tr
                                    key={f.path}
                                    className={i === selectedIdx ? 'selected-row' : ''}
                                    onClick={() => setSelectedIdx(i)}
                                    onDoubleClick={() => insertSelected(f)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td><strong>{f.name.replace(/\.csv$/i, '')}</strong></td>
                                    <td title={f.path} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px', color: '#666' }}>{f.path}</td>
                                </tr>
                            ))}
                            {results.length === 0 && !scanning && (
                                <tr><td colSpan={2} style={{ textAlign: 'center', color: '#888', padding: '12px' }}>
                                    {query ? 'No matches' : 'Start typing to search'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DialogBase>
    );
}
