import React, { useState } from 'react';
import { usePlotStore } from '../../store/plotStore.js';
import { useDataStore } from '../../store/dataStore.js';

export default function PlotTabs() {
    const { plots, activePlotId, plotOrder, setActivePlot, addPlot, removePlot, renamePlot } = usePlotStore();
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    const handleTabClick = (id) => {
        if (id !== activePlotId) {
            setActivePlot(id);
        }
    };

    const handleClose = (e, id) => {
        e.stopPropagation();
        if (plotOrder.length > 1) {
            // Clear the series for this plot
            useDataStore.getState().clearAll();
            removePlot(id);
        }
    };

    const handleDoubleClick = (id) => {
        setEditingId(id);
        setEditName(plots[id]?.name || '');
    };

    const handleRenameSubmit = () => {
        if (editingId && editName.trim()) {
            renamePlot(editingId, editName.trim());
        }
        setEditingId(null);
    };

    const handleAddPlot = () => {
        useDataStore.getState().clearAll();
        addPlot();
    };

    return (
        <div className="plot-tabs">
            {plotOrder.map(id => {
                const plot = plots[id];
                if (!plot) return null;
                const isActive = id === activePlotId;

                return (
                    <div
                        key={id}
                        className={`plot-tab ${isActive ? 'active' : ''}`}
                        onClick={() => handleTabClick(id)}
                        onDoubleClick={() => handleDoubleClick(id)}
                    >
                        {editingId === id ? (
                            <input
                                className="plot-tab-edit"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleRenameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubmit();
                                    if (e.key === 'Escape') setEditingId(null);
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="plot-tab-label">{plot.name}</span>
                        )}
                        {plotOrder.length > 1 && (
                            <span
                                className="plot-tab-close"
                                onClick={(e) => handleClose(e, id)}
                                title="Close plot"
                            >
                                &times;
                            </span>
                        )}
                    </div>
                );
            })}
            <div className="plot-tab add-tab" onClick={handleAddPlot} title="New plot">
                +
            </div>
        </div>
    );
}
