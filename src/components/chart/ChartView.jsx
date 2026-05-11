import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useDataStore } from '../../store/dataStore.js';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';

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
    const setHover = useAppStore(s => s.setHover);
    const clearHover = useAppStore(s => s.clearHover);
    const plotType = usePlotStore(s => s.plots[s.activePlotId]?.plotType) || 'timeseries';
    const axisConfigRaw = usePlotStore(s => s.plots[s.activePlotId]?.axisConfig);
    const axisConfig = useMemo(() => axisConfigRaw || {}, [axisConfigRaw]);
    const titlesRaw = usePlotStore(s => s.plots[s.activePlotId]?.titles);
    const titles = useMemo(() => titlesRaw || {}, [titlesRaw]);
    const styleConfigRaw = usePlotStore(s => s.plots[s.activePlotId]?.styleConfig);
    const styleConfig = useMemo(() => styleConfigRaw || {}, [styleConfigRaw]);
    const userAnnotationsRaw = usePlotStore(s => s.plots[s.activePlotId]?.annotations);
    const userAnnotations = useMemo(() => userAnnotationsRaw || [], [userAnnotationsRaw]);
    const seriesOrderRaw = usePlotStore(s => s.plots[s.activePlotId]?.seriesOrder);
    const seriesOrder = useMemo(() => seriesOrderRaw || [], [seriesOrderRaw]);
    const chartAction = usePlotStore(s => s.chartAction);

    // Context menu state
    const [contextMenu, setContextMenu] = useState(null);
    const plotRef = useRef(null);
    const containerRef = useRef(null);

    // Apply persisted seriesOrder (drag-to-reorder), then append any new keys.
    const rawKeys = Object.keys(seriesMap);
    const seriesKeys = [
        ...seriesOrder.filter(k => rawKeys.includes(k)),
        ...rawKeys.filter(k => !seriesOrder.includes(k)),
    ];

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

    const getPlotEl = useCallback(() => plotRef.current?.el || null, []);

    const handleZoomBackOut = useCallback(() => {
        const plotEl = getPlotEl();
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
    }, [closeContextMenu, getPlotEl]);

    const handleCopyGraphics = useCallback(() => {
        const plotEl = getPlotEl();
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
    }, [closeContextMenu, getPlotEl]);

    const zoomBy = useCallback((factor) => {
        const plotEl = getPlotEl();
        if (!plotEl?.layout?.xaxis?.range) return;
        import('plotly.js-basic-dist-min').then(Plotly => {
            const [a, b] = plotEl.layout.xaxis.range;
            const ta = new Date(a).getTime();
            const tb = new Date(b).getTime();
            const mid = (ta + tb) / 2;
            const halfSpan = ((tb - ta) / 2) * factor;
            Plotly.default.relayout(plotEl, {
                'xaxis.range': [new Date(mid - halfSpan).toISOString(), new Date(mid + halfSpan).toISOString()],
            });
        });
    }, [getPlotEl]);

    const exportImage = useCallback((opts) => {
        const plotEl = getPlotEl();
        if (!plotEl || !opts?.path) return;
        const format = opts.format || 'png';
        import('plotly.js-basic-dist-min').then(Plotly => {
            Plotly.default.toImage(plotEl, { format, width: 1200, height: 600 }).then(async (dataUrl) => {
                try {
                    if (format === 'svg') {
                        const svg = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml,/, ''));
                        await window.electron.fs.writeFile(opts.path, svg);
                    } else {
                        // PNG/JPEG come as data:image/png;base64,<b64>. Send the base64
                        // payload to the main process which decodes and writes as binary.
                        const base64 = dataUrl.split(',')[1];
                        await window.electron.fs.writeBinary(opts.path, base64);
                    }
                    useAppStore.setState({ statusMessage: `Saved: ${opts.path}` });
                } catch (err) {
                    useAppStore.setState({ statusMessage: `Save failed: ${err.message}` });
                }
            });
        });
    }, [getPlotEl]);

    const zoomToDataStart = useCallback(() => {
        const plotEl = getPlotEl();
        if (!plotEl) return;
        // Find earliest series start across all visible traces
        let earliest = null;
        Object.values(seriesMap).forEach(s => {
            const first = s.dates?.[0];
            if (first && (!earliest || first < earliest)) earliest = first;
        });
        if (!earliest) return;
        import('plotly.js-basic-dist-min').then(Plotly => {
            // Show a 1-year window from the earliest data point
            const start = new Date(earliest);
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            Plotly.default.relayout(plotEl, {
                'xaxis.range': [start.toISOString(), end.toISOString()],
            });
        });
    }, [getPlotEl, seriesMap]);

    // React to chart action requests from outside (menu, toolbar, shortcuts)
    useEffect(() => {
        if (!chartAction) return;
        switch (chartAction.type) {
            case 'zoomBackOut': handleZoomBackOut(); break;
            case 'copyGraphics': handleCopyGraphics(); break;
            case 'zoomIn': zoomBy(0.7); break;
            case 'zoomOut': zoomBy(1.4); break;
            case 'zoomToDataStart': zoomToDataStart(); break;
            case 'exportImage': exportImage(chartAction.payload); break;
            default: break;
        }
    }, [chartAction]); // eslint-disable-line react-hooks/exhaustive-deps

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

            // Series are already filtered to the applied date window in
            // ExpressionPanel.handleGo — render them as-is.
            const dates = series.dates;
            const values = series.values;
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

        // User-defined labels (Insert > Label). Plotly arrows + text combo.
        for (const a of userAnnotations) {
            annotations.push({
                x: a.x,
                y: a.y,
                xref: 'x',
                yref: 'y',
                text: a.text,
                showarrow: true,
                arrowhead: 2,
                arrowsize: 1,
                arrowwidth: 1,
                ax: 0,
                ay: -30,
                font: { family: 'Tahoma', size: 11, color: a.color || '#cc0000' },
                bgcolor: 'rgba(255,255,255,0.85)',
                bordercolor: a.color || '#cc0000',
                borderwidth: 1,
                borderpad: 2,
            });
        }

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

        const fontFamily = styleConfig.fontFamily || 'Tahoma';
        const fontSize = styleConfig.fontSize || 10;
        const titleSize = styleConfig.titleSize || 14;
        const margin = {
            l: styleConfig.marginLeft ?? 50,
            r: styleConfig.marginRight ?? (hasRightAxis ? 50 : 20),
            t: styleConfig.marginTop ?? 40,
            b: styleConfig.marginBottom ?? 30,
        };
        const plotBg = styleConfig.plotBg || '#ffffff';
        const paperBg = styleConfig.paperBg || '#ffffff';

        const chartLayout = {
            autosize: true,
            margin,
            title: {
                text: plotTitle || (seriesKeys.length === 1 ? seriesKeys[0] : ''),
                font: { family: fontFamily, size: titleSize }
            },
            xaxis: {
                showgrid: true, zeroline: false, gridcolor: '#e0e0e0',
                tickfont: { family: fontFamily, size: fontSize },
                showspikes: plotType === 'timeseries',
                spikemode: 'across',
                spikesnap: 'cursor',
                spikecolor: '#888',
                spikethickness: 1,
                spikedash: 'solid',
                title: titles.xAxis ? { text: titles.xAxis, font: { family: fontFamily, size: fontSize + 1 } } : undefined,
            },
            yaxis: {
                showgrid: true, gridcolor: '#e0e0e0', tickfont: { family: fontFamily, size: fontSize },
                title: titles.yAxis ? { text: titles.yAxis, font: { family: fontFamily, size: fontSize + 1 } } : undefined,
            },
            legend: { orientation: 'h', y: 1.1, font: { family: fontFamily, size: fontSize } },
            plot_bgcolor: plotBg,
            paper_bgcolor: paperBg,
            annotations,
            dragmode: 'zoom',
            hovermode: plotType === 'timeseries' ? 'x unified' : 'closest',
            hoverlabel: {
                bgcolor: '#fffacd',
                bordercolor: '#888',
                font: { family: 'Consolas, "Courier New", monospace', size: 11, color: '#000' },
                namelength: 30,
            },
        };

        if (hasRightAxis) {
            chartLayout.yaxis2 = {
                overlaying: 'y', side: 'right', showgrid: false,
                tickfont: { family: fontFamily, size: fontSize },
                title: titles.y2Axis ? { text: titles.y2Axis, font: { family: fontFamily, size: fontSize + 1 } } : undefined,
            };
        }

        // Apply user-defined axis configuration (log scale, range, ticks)
        if (axisConfig.yLog) chartLayout.yaxis.type = 'log';
        if (axisConfig.yMin !== '' && axisConfig.yMin != null) {
            const min = parseFloat(axisConfig.yMin);
            const max = axisConfig.yMax !== '' ? parseFloat(axisConfig.yMax) : null;
            if (!isNaN(min)) {
                chartLayout.yaxis.range = [
                    axisConfig.yLog ? Math.log10(Math.max(min, 1e-12)) : min,
                    max != null && !isNaN(max) ? (axisConfig.yLog ? Math.log10(Math.max(max, 1e-12)) : max) : undefined,
                ];
                chartLayout.yaxis.autorange = false;
            }
        }
        if (axisConfig.yDtick && !isNaN(parseFloat(axisConfig.yDtick))) {
            chartLayout.yaxis.dtick = parseFloat(axisConfig.yDtick);
        }
        if (hasRightAxis && axisConfig.y2Log) chartLayout.yaxis2.type = 'log';
        if (hasRightAxis && axisConfig.y2Min !== '' && axisConfig.y2Min != null) {
            const min = parseFloat(axisConfig.y2Min);
            const max = axisConfig.y2Max !== '' ? parseFloat(axisConfig.y2Max) : null;
            if (!isNaN(min)) {
                chartLayout.yaxis2.range = [
                    axisConfig.y2Log ? Math.log10(Math.max(min, 1e-12)) : min,
                    max != null && !isNaN(max) ? (axisConfig.y2Log ? Math.log10(Math.max(max, 1e-12)) : max) : undefined,
                ];
                chartLayout.yaxis2.autorange = false;
            }
        }

        return { plotData: data, layout: chartLayout };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seriesMap, plotTitle, plotType, axisConfig, titles, styleConfig, userAnnotations, seriesOrder]);

    if (seriesKeys.length === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', color: '#888', background: '#fff'
            }}>
                <div style={{ fontSize: '32px', opacity: 0.2, fontWeight: 'bold', marginBottom: '8px' }}>DATAVIS</div>
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

