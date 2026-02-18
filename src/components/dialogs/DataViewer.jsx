import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import DialogBase from './DialogBase.jsx';
import { useDataStore } from '../../store/dataStore.js';
import { dateAlignMultiple } from '../../services/expression/dateAlign.js';

const ROW_HEIGHT = 20;
const BUFFER_ROWS = 10;

export default function DataViewer({ merged = false, onClose }) {
    const { seriesMap } = useDataStore();
    const seriesList = Object.values(seriesMap);
    const [scrollTop, setScrollTop] = useState(0);
    const scrollRef = useRef(null);

    const tableData = useMemo(() => {
        if (seriesList.length === 0) return null;

        if (merged) {
            return dateAlignMultiple(seriesList);
        }

        // Non-merged: use the longest series' dates as the row index
        const longestSeries = seriesList.reduce((a, b) => a.dates.length >= b.dates.length ? a : b);
        const allDates = [...longestSeries.dates];
        const allColumns = {};
        for (const series of seriesList) {
            allColumns[series.name] = [];
            for (let i = 0; i < allDates.length; i++) {
                allColumns[series.name].push(i < series.values.length ? series.values[i] : null);
            }
        }
        return { dates: allDates, columns: allColumns };
    }, [seriesList, merged]);

    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    if (!tableData || seriesList.length === 0) {
        return (
            <DialogBase title={merged ? 'View Merged Data' : 'View Data'} onClose={onClose} width={600}>
                <p style={{ padding: '8px', fontSize: '11px' }}>No data loaded.</p>
            </DialogBase>
        );
    }

    const names = Object.keys(tableData.columns);
    const totalRows = tableData.dates.length;
    const containerHeight = 400;
    const totalHeight = totalRows * ROW_HEIGHT;

    // Calculate visible window
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endIdx = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS);
    const visibleDates = tableData.dates.slice(startIdx, endIdx);

    return (
        <DialogBase title={merged ? 'View Merged Data' : 'View Data'} onClose={onClose} width={Math.min(800, 150 + names.length * 120)} footer={
            <div className="dialog-footer">
                <button className="win-button" onClick={() => {
                    let text = 'Date\t' + names.join('\t') + '\n';
                    tableData.dates.forEach((d, i) => {
                        const row = [d, ...names.map(n => tableData.columns[n][i] ?? '')];
                        text += row.join('\t') + '\n';
                    });
                    navigator.clipboard.writeText(text);
                }}>Copy All</button>
                <button className="win-button" onClick={onClose}>Close</button>
            </div>
        }>
            <div
                ref={scrollRef}
                className="data-viewer-scroll"
                style={{ maxHeight: `${containerHeight}px`, overflow: 'auto' }}
                onScroll={handleScroll}
            >
                <table className="data-viewer-table" style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th style={{ position: 'sticky', top: 0, zIndex: 1 }}>Date</th>
                            {names.map(n => <th key={n} title={n} style={{ position: 'sticky', top: 0, zIndex: 1 }}>{n}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Spacer for virtualized rows before visible range */}
                        {startIdx > 0 && (
                            <tr><td colSpan={names.length + 1} style={{ height: startIdx * ROW_HEIGHT, padding: 0, border: 'none' }} /></tr>
                        )}
                        {visibleDates.map((date, vi) => {
                            const i = startIdx + vi;
                            return (
                                <tr key={i} style={{ height: ROW_HEIGHT }}>
                                    <td>{date}</td>
                                    {names.map(n => (
                                        <td key={n}>
                                            {tableData.columns[n][i] !== null
                                                ? (typeof tableData.columns[n][i] === 'number'
                                                    ? tableData.columns[n][i].toFixed(4)
                                                    : tableData.columns[n][i])
                                                : ''}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                        {/* Spacer for virtualized rows after visible range */}
                        {endIdx < totalRows && (
                            <tr><td colSpan={names.length + 1} style={{ height: (totalRows - endIdx) * ROW_HEIGHT, padding: 0, border: 'none' }} /></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </DialogBase>
    );
}
