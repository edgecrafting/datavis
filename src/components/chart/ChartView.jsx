import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useDataStore } from '../../store/dataStore.js';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';
import { parseDateInput } from '../../services/dates/normalize.js';

function formatDateMarker(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()}${months[d.getMonth()]}${d.getFullYear()}`;
}

function formatZoomDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).substring(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ChartView() {
    const { seriesMap } = useDataStore();
    const plotTitle = useAppStore(s => s.plotTitle);
    const appliedStartDate = useAppStore(s => s.appliedStartDate);
    const appliedEndDate = useAppStore(s => s.appliedEndDate);
    const setHover = useAppStore(s => s.setHover);
    const clearHover = useAppStore(s => s.clearHover);
    const plotType = usePlotStore(s => s.plots[s.activePlotId]?.plotType) || 'timeseries';

    // Context menu state
    const [contextMenu, setContextMenu] = useState(null);
    const plotRef = useRef(null);
    const containerRef = useRef(null);

    const seriesKeys = Object.keys(seriesMap);

    const handleHover = useCallback((event) => {
        if (event.points && event.points.length > 0) {
            const pt = event.points[0];
            setHover(pt.x, pt.y);
        }
    }, [setHover]);

    const handleUnhover = useCallback(() => {
        clearHover();
    }, [clearHover]);

    // Capture zoom range from Plotly relayout events
    const handleRelayout = useCallback((layoutUpdate) => {
        if (layoutUpdate['xaxis.range[0]'] && layoutUpdate['xaxis.range[1]']) {
            useAppStore.setState({
                zoomStartDate: formatZoomDate(layoutUpdate['xaxis.range[0]']),
                zoomEndDate: formatZoomDate(layoutUpdate['xaxis.range[1]']),
            });
        } else if (layoutUpdate['xaxis.range']) {
            useAppStore.setState({
                zoomStartDate: formatZoomDate(layoutUpdate['xaxis.range'][0]),
                zoomEndDate: formatZoomDate(layoutUpdate['xaxis.range'][1]),
            });
        } else if (layoutUpdate['xaxis.autorange']) {
            useAppStore.setState({ zoomStartDate: null, zoomEndDate: null });
        }
    }, []);

    // Block Plotly from receiving right-click entirely (both contextmenu and mousedown button=2)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const blockContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY });
        };
        const blockRightMouseDown = (e) => {
            if (e.button === 2) {
                e.stopPropagation();
            }
        };
        container.addEventListener('contextmenu', blockContextMenu, true);
        container.addEventListener('mousedown', blockRightMouseDown, true);
        return () => {
            container.removeEventListener('contextmenu', blockContextMenu, true);
            container.removeEventListener('mousedown', blockRightMouseDown, true);
        };
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const handleZoomBackOut = useCallback(() => {
        const plotEl = document.querySelector('.js-plotly-plot');
        if (plotEl) {
            import('plotly.js-basic-dist-min').then(Plotly => {
                Plotly.default.relayout(plotEl, {
                    'xaxis.autorange': true,
                    'yaxis.autorange': true,
                    'yaxis2.autorange': true,
                });
            });
        }
        useAppStore.setState({ zoomStartDate: null, zoomEndDate: null });
        closeContextMenu();
    }, [closeContextMenu]);

    const handleCopyGraphics = useCallback(() => {
        const plotEl = document.querySelector('.js-plotly-plot');
        if (plotEl) {
            import('plotly.js-basic-dist-min').then(Plotly => {
                Plotly.default.toImage(plotEl, { format: 'png', width: 1200, height: 600 }).then(url => {
                    fetch(url).then(r => r.blob()).then(blob => {
                        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                        useAppStore.setState({ statusMessage: 'Graphics copied to clipboard' });
                    });
                });
            });
        }
        closeContextMenu();
    }, [closeContextMenu]);

    const { plotData, layout } = useMemo(() => {
        if (seriesKeys.length === 0) return { plotData: [], layout: {} };

        const data = [];
        let globalMinDate = null;
        let globalMaxDate = null;

        seriesKeys.forEach((key, index) => {
            const series = seriesMap[key];
            const config = series.config || {};

            if (config.hidden || config.disabled) return;

            const color = series.color || config.color || getSeriesColor(index);

            // Apply date range filtering using APPLIED dates (only set on F9)
            let dates = series.dates;
            let values = series.values;
            if (appliedStartDate || appliedEndDate) {
                const filtered = filterByDateRange(dates, values, appliedStartDate, appliedEndDate);
                dates = filtered.dates;
                values = filtered.values;
            }

            if (dates.length === 0) return;

            if (!globalMinDate || dates[0] < globalMinDate) globalMinDate = dates[0];
            if (!globalMaxDate || dates[dates.length - 1] > globalMaxDate) globalMaxDate = dates[dates.length - 1];

            const trace = {
                x: dates,
                y: values,
                name: series.name || key,
                line: { width: config.lineWidth || 1.5, color },
                marker: { color },
            };

            if (plotType === 'histogram') {
                trace.type = 'histogram';
                trace.x = values;
                delete trace.y;
            } else if (plotType === 'scatter') {
                trace.type = 'scatter';
                trace.mode = 'markers';
            } else if (plotType === 'pie') {
                trace.type = 'pie';
                trace.labels = dates.slice(-20);
                trace.values = values.slice(-20);
                delete trace.x;
                delete trace.y;
            } else {
                trace.type = 'scatter';
                trace.mode = 'lines';
            }

            if (config.onRight) {
                trace.yaxis = 'y2';
            }

            data.push(trace);
        });

        const annotations = [];
        if (globalMinDate && plotType === 'timeseries') {
            annotations.push({
                x: globalMinDate, y: 1.02, xref: 'x', yref: 'paper',
                text: `\u251C\u2500${formatDateMarker(globalMinDate)}\u2500`,
                showarrow: false, font: { size: 9, family: 'Tahoma', color: '#666' }, xanchor: 'left',
            });
        }
        if (globalMaxDate && plotType === 'timeseries') {
            annotations.push({
                x: globalMaxDate, y: 1.02, xref: 'x', yref: 'paper',
                text: `\u2500${formatDateMarker(globalMaxDate)}\u2500\u2524`,
                showarrow: false, font: { size: 9, family: 'Tahoma', color: '#666' }, xanchor: 'right',
            });
        }

        const hasRightAxis = data.some(t => t.yaxis === 'y2');

        const chartLayout = {
            autosize: true,
            margin: { l: 50, r: hasRightAxis ? 50 : 20, t: 40, b: 30 },
            title: {
                text: plotTitle || (seriesKeys.length === 1 ? seriesKeys[0] : ''),
                font: { family: 'Tahoma', size: 14 }
            },
            xaxis: { showgrid: true, zeroline: false, gridcolor: '#e0e0e0', tickfont: { family: 'Tahoma', size: 10 } },
            yaxis: { showgrid: true, gridcolor: '#e0e0e0', tickfont: { family: 'Tahoma', size: 10 } },
            legend: { orientation: 'h', y: 1.1, font: { family: 'Tahoma', size: 10 } },
            plot_bgcolor: '#ffffff',
            paper_bgcolor: '#ffffff',
            annotations,
            dragmode: 'zoom',
        };

        if (hasRightAxis) {
            chartLayout.yaxis2 = {
                overlaying: 'y', side: 'right', showgrid: false,
                tickfont: { family: 'Tahoma', size: 10 }
            };
        }

        return { plotData: data, layout: chartLayout };
    }, [seriesMap, seriesKeys, plotTitle, appliedStartDate, appliedEndDate, plotType]);

    if (seriesKeys.length === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: '#888', background: '#fff'
            }}>
                <div style={{ fontSize: '32px', opacity: 0.2, fontWeight: 'bold', marginBottom: '8px' }}>PLOTTOOL</div>
                <div style={{ fontSize: '12px' }}>Double-click a .csv file or type an expression and press F9</div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Plot
                ref={plotRef}
                data={plotData}
                layout={layout}
                useResizeHandler={true}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true, displayModeBar: false, scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnhover}
                onRelayout={handleRelayout}
            />

            {/* Right-click context menu */}
            {contextMenu && (
                <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000 }}
                        onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} />
                    <div className="menu-dropdown" style={{
                        position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 3001, minWidth: '160px',
                    }}>
                        <div className="menu-item" onClick={handleZoomBackOut}>
                            <span className="menu-check" />
                            <span className="menu-label">Zoom Back Out</span>
                        </div>
                        <div className="menu-separator" />
                        <div className="menu-item" onClick={handleCopyGraphics}>
                            <span className="menu-check" />
                            <span className="menu-label">Copy Graphics</span>
                        </div>
                        <div className="menu-item" onClick={async () => {
                            const series = Object.values(seriesMap);
                            if (series.length === 0) { closeContextMenu(); return; }
                            const { dateAlignMultiple } = await import('../../services/expression/dateAlign.js');
                            const aligned = dateAlignMultiple(series);
                            const names = Object.keys(aligned.columns);
                            let text = 'Date\t' + names.join('\t') + '\n';
                            for (let i = 0; i < aligned.dates.length; i++) {
                                const row = [aligned.dates[i], ...names.map(n => aligned.columns[n][i] ?? '')];
                                text += row.join('\t') + '\n';
                            }
                            navigator.clipboard.writeText(text);
                            useAppStore.setState({ statusMessage: 'Data copied to clipboard' });
                            closeContextMenu();
                        }}>
                            <span className="menu-check" />
                            <span className="menu-label">Copy Data</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function filterByDateRange(dates, values, startDateStr, endDateStr) {
    if (!startDateStr && !endDateStr) return { dates, values };

    const start = parseDateInput(startDateStr);
    const end = parseDateInput(endDateStr);

    const filteredDates = [];
    const filteredValues = [];

    for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]);
        if (isNaN(d.getTime())) {
            filteredDates.push(dates[i]);
            filteredValues.push(values[i]);
            continue;
        }
        if (start && d < start) continue;
        if (end && d > end) continue;
        filteredDates.push(dates[i]);
        filteredValues.push(values[i]);
    }

    return { dates: filteredDates, values: filteredValues };
}
