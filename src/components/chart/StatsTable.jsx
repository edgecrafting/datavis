import React, { useState, useCallback } from 'react';
import { useDataStore } from '../../store/dataStore.js';
import { usePlotStore } from '../../store/plotStore.js';
import { useAppStore } from '../../store/appStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';
import { dateAlignMultiple } from '../../services/expression/dateAlign.js';

function formatPct(val) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return (val * 100).toFixed(1) + '%';
}

function formatNum(val, decimals = 4) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return val.toFixed(decimals);
}

export default function StatsTable() {
    const seriesMap = useDataStore(s => s.seriesMap);
    const toggleSeries = usePlotStore(s => s.setSeriesConfig);
    const seriesOrder = usePlotStore(s => s.plots[s.activePlotId]?.seriesOrder) || [];
    const [contextMenu, setContextMenu] = useState(null); // { x, y, key }
    const [dragIdx, setDragIdx] = useState(null);
    const [dropTargetIdx, setDropTargetIdx] = useState(null);

    // Apply persisted order: keys present in seriesOrder come first (in that order),
    // then any new keys (from the latest evaluation) appended at the end.
    const rawKeys = Object.keys(seriesMap);
    const orderedKeys = [
        ...seriesOrder.filter(k => rawKeys.includes(k)),
        ...rawKeys.filter(k => !seriesOrder.includes(k)),
    ];
    const keys = orderedKeys;

    const closeMenu = useCallback(() => setContextMenu(null), []);

    if (keys.length === 0) return null;

    const reorder = (fromIdx, toIdx) => {
        if (fromIdx === toIdx || fromIdx == null || toIdx == null) return;
        const next = [...keys];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        const id = usePlotStore.getState().activePlotId;
        usePlotStore.getState().updatePlot(id, { seriesOrder: next });
    };

    const handleSwatchClick = (key) => {
        const cfg = seriesMap[key]?.config || {};
        toggleSeries(key, { hidden: !cfg.hidden });
        usePlotStore.getState().requestEvaluation();
    };

    const handleRowContextMenu = (e, key) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, key });
    };

    const ctxAction = (fn) => () => { fn(); closeMenu(); };

    const renderMenu = () => {
        if (!contextMenu) return null;
        const key = contextMenu.key;
        const series = seriesMap[key];
        if (!series) return null;
        const cfg = series.config || {};
        const triggerRecalc = () => usePlotStore.getState().requestEvaluation();

        return (
            <>
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000 }}
                    onClick={closeMenu}
                    onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
                />
                <div
                    className="menu-dropdown"
                    style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 3001, minWidth: '180px' }}
                >
                    <div className="menu-item" onClick={ctxAction(() => {
                        toggleSeries(key, { hidden: !cfg.hidden });
                        triggerRecalc();
                    })}>
                        <span className="menu-check">{cfg.hidden ? '✓' : ''}</span>
                        <span className="menu-label">Hidden</span>
                    </div>
                    <div className="menu-item" onClick={ctxAction(() => {
                        toggleSeries(key, { disabled: !cfg.disabled });
                        triggerRecalc();
                    })}>
                        <span className="menu-check">{cfg.disabled ? '✓' : ''}</span>
                        <span className="menu-label">Disabled</span>
                    </div>
                    <div className="menu-item" onClick={ctxAction(() => {
                        toggleSeries(key, { onRight: !cfg.onRight });
                        triggerRecalc();
                    })}>
                        <span className="menu-check">{cfg.onRight ? '✓' : ''}</span>
                        <span className="menu-label">On Right Axis</span>
                    </div>
                    <div className="menu-separator" />
                    <div className="menu-item" onClick={ctxAction(() => {
                        useAppStore.setState({
                            activeDialog: 'seriesProperties',
                            seriesPropertiesKey: key,
                        });
                    })}>
                        <span className="menu-check" />
                        <span className="menu-label">Properties...</span>
                    </div>
                    <div className="menu-separator" />
                    <div className="menu-item" onClick={ctxAction(() => {
                        navigator.clipboard.writeText(series.name || key);
                        useAppStore.setState({ statusMessage: 'Name copied' });
                    })}>
                        <span className="menu-check" />
                        <span className="menu-label">Copy Name</span>
                    </div>
                    <div className="menu-item" onClick={ctxAction(() => {
                        const aligned = dateAlignMultiple([series]);
                        let text = `Date\t${series.name}\n`;
                        for (let i = 0; i < aligned.dates.length; i++) {
                            text += `${aligned.dates[i]}\t${aligned.columns[series.name][i] ?? ''}\n`;
                        }
                        navigator.clipboard.writeText(text);
                        useAppStore.setState({ statusMessage: 'Series data copied' });
                    })}>
                        <span className="menu-check" />
                        <span className="menu-label">Copy Data</span>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="stats-table-container">
            <table className="stats-table">
                <thead>
                    <tr>
                        <th className="stats-header" style={{ width: '14px' }}></th>
                        <th className="stats-header stats-name">Name</th>
                        <th className="stats-header">AR</th>
                        <th className="stats-header">Vol</th>
                        <th className="stats-header">Sharpe</th>
                        <th className="stats-header">MaxDD</th>
                        <th className="stats-header">MinR1</th>
                        <th className="stats-header">MaxR1</th>
                    </tr>
                </thead>
                <tbody>
                    {keys.map((key, index) => {
                        const series = seriesMap[key];
                        const stats = series.stats || {};
                        const color = series.color || getSeriesColor(index);
                        const config = series.config || {};

                        if (config.hidden) return null;
                        const isDropTarget = dropTargetIdx === index && dragIdx !== index;

                        return (
                            <tr
                                key={key}
                                className={`stats-row ${config.disabled ? 'disabled' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                                onContextMenu={(e) => handleRowContextMenu(e, key)}
                                onDragOver={(e) => { e.preventDefault(); setDropTargetIdx(index); }}
                                onDragLeave={() => setDropTargetIdx(prev => (prev === index ? null : prev))}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    reorder(dragIdx, index);
                                    setDragIdx(null);
                                    setDropTargetIdx(null);
                                }}
                            >
                                <td className="stats-cell">
                                    <span
                                        className="stats-swatch"
                                        style={{ backgroundColor: color, cursor: 'grab' }}
                                        title="Click to hide/show, drag to reorder, right-click for options"
                                        draggable
                                        onDragStart={(e) => {
                                            setDragIdx(index);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragEnd={() => { setDragIdx(null); setDropTargetIdx(null); }}
                                        onClick={() => handleSwatchClick(key)}
                                    />
                                </td>
                                <td className="stats-cell stats-name" title={key}>{series.name || key}</td>
                                <td className="stats-cell stats-num">{formatPct(stats.ar)}</td>
                                <td className="stats-cell stats-num">{formatPct(stats.vol)}</td>
                                <td className="stats-cell stats-num">{formatNum(stats.sharpe, 2)}</td>
                                <td className="stats-cell stats-num">{formatPct(stats.maxDD)}</td>
                                <td className="stats-cell stats-num">{formatPct(stats.minR1)}</td>
                                <td className="stats-cell stats-num">{formatPct(stats.maxR1)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {renderMenu()}
        </div>
    );
}
