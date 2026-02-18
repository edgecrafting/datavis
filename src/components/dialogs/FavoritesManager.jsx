import React, { useState, useEffect } from 'react';
import DialogBase from './DialogBase.jsx';
import { getFavorites, addFavorite, removeFavorite } from '../../services/favorites/manager.js';
import { useAppStore } from '../../store/appStore.js';

export default function FavoritesManager({ onClose }) {
    const [favorites, setFavorites] = useState([]);
    const [newPath, setNewPath] = useState('');
    const [newName, setNewName] = useState('');
    const rootPath = useAppStore(s => s.rootPath);

    useEffect(() => {
        setFavorites(getFavorites());
    }, []);

    const handleAdd = () => {
        if (newPath.trim()) {
            const result = addFavorite({
                name: newName.trim() || newPath.split(/[\\/]/).pop(),
                path: newPath.trim(),
                type: 'file'
            });
            setFavorites(result);
            setNewPath('');
            setNewName('');
        }
    };

    const handleRemove = (path) => {
        const result = removeFavorite(path);
        setFavorites(result);
    };

    const handleBrowse = async () => {
        if (window.electron?.dialog?.openDirectory) {
            const dir = await window.electron.dialog.openDirectory();
            if (dir) setNewPath(dir);
        }
    };

    return (
        <DialogBase title="Favorite Symbols" onClose={onClose} width={450} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div style={{ padding: '4px' }}>
                <div className="data-viewer-scroll" style={{ maxHeight: '200px', marginBottom: '8px' }}>
                    <table className="data-viewer-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Path</th>
                                <th style={{ width: '50px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {favorites.map((f, i) => (
                                <tr key={i}>
                                    <td>{f.name}</td>
                                    <td title={f.path} style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.path}</td>
                                    <td>
                                        <button className="win-button" onClick={() => handleRemove(f.path)} style={{ padding: '0 4px', height: '16px', fontSize: '10px' }}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                            {favorites.length === 0 && (
                                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>No favorites yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ borderTop: '1px solid #999', paddingTop: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Add Favorite:</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        <input
                            className="expression-input"
                            style={{ width: '80px' }}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Name"
                        />
                        <input
                            className="expression-input"
                            style={{ flex: 1 }}
                            value={newPath}
                            onChange={(e) => setNewPath(e.target.value)}
                            placeholder="Path"
                        />
                        <button className="win-button" onClick={handleBrowse}>...</button>
                        <button className="win-button" onClick={handleAdd}>Add</button>
                    </div>
                </div>
            </div>
        </DialogBase>
    );
}
