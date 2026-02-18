import React, { useState, useRef, useCallback, useEffect } from 'react';
import { evaluateMultiline } from '../../services/expression/evaluator.js';
import { useDataStore } from '../../store/dataStore.js';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';

// Zoom range display (shown after chart zoom interaction)
function ZoomRangeDisplay() {
    const zoomStart = useAppStore(s => s.zoomStartDate);
    const zoomEnd = useAppStore(s => s.zoomEndDate);
    if (!zoomStart && !zoomEnd) return null;
    return (
        <div className="expression-controls" style={{ fontSize: '10px', opacity: 0.7, paddingTop: 0 }}>
            <span style={{ color: '#666', marginRight: '4px' }}>Zoom:</span>
            <input readOnly value={zoomStart || ''} className="expression-input small" style={{ background: '#f0f0f0' }} />
            <input readOnly value={zoomEnd || ''} className="expression-input small" style={{ background: '#f0f0f0' }} />
        </div>
    );
}

// Global ref so F9 command can trigger calculate
let globalCalculateRef = null;

export function triggerCalculate() {
    if (globalCalculateRef) globalCalculateRef();
}

const ExpressionPanel = () => {
    // 2B: Expression text stored per-plot in plotStore
    const activePlotId = usePlotStore(s => s.activePlotId);
    const expression = usePlotStore(s => s.plots[s.activePlotId]?.expressions || '');
    const historyTimerRef = useRef(null);
    const setExpression = useCallback((text) => {
        const store = usePlotStore.getState();
        const id = store.activePlotId;
        if (id) {
            store.updatePlot(id, { expressions: text });
            // Debounce history push (500ms after last keystroke)
            if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
            historyTimerRef.current = setTimeout(() => {
                usePlotStore.getState().pushExpressionHistory(id, text);
            }, 500);
        }
    }, []);

    const [error, setError] = useState(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [rightAxisLines, setRightAxisLines] = useState(new Set());
    const [pendingRecalc, setPendingRecalc] = useState(0);
    const rightAxisRef = useRef(rightAxisLines);
    const textareaRef = useRef(null);
    const { setSeriesMap, clearAll } = useDataStore();
    const { plotTitle, setPlotTitle, startDate, setStartDate, endDate, setEndDate } = useAppStore();

    // Keep ref in sync
    useEffect(() => {
        rightAxisRef.current = rightAxisLines;
    }, [rightAxisLines]);

    const handleGo = useCallback(async () => {
        if (isEvaluating) return;

        try {
            setError(null);
            setIsEvaluating(true);

            // Apply start/end dates only on F9/GO
            useAppStore.setState({
                appliedStartDate: startDate,
                appliedEndDate: endDate,
                zoomStartDate: null,
                zoomEndDate: null,
            });

            const text = expression.trim();
            if (!text) {
                clearAll();
                setIsEvaluating(false);
                return;
            }

            const results = await evaluateMultiline(text);

            // Build new seriesMap from results — use ref for latest rightAxisLines
            const currentRightAxis = rightAxisRef.current;
            const newMap = {};
            results.forEach((result, i) => {
                if (result && result.dates && result.values) {
                    const color = getSeriesColor(i);
                    const config = {
                        onRight: currentRightAxis.has(i),
                    };
                    newMap[result.name] = {
                        ...result,
                        color,
                        config,
                    };
                }
            });

            setSeriesMap(newMap);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsEvaluating(false);
        }
    }, [expression, isEvaluating, clearAll, setSeriesMap, startDate, endDate]);

    // Trigger recalc when pendingRecalc changes (after Ctrl+T toggle)
    useEffect(() => {
        if (pendingRecalc > 0) {
            handleGo();
        }
    }, [pendingRecalc]); // eslint-disable-line react-hooks/exhaustive-deps

    // Register global calculate ref for F9
    useEffect(() => {
        globalCalculateRef = handleGo;
        return () => { globalCalculateRef = null; };
    }, [handleGo]);

    // Get current line number from cursor position
    const getCurrentLineIndex = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return 0;
        const text = textarea.value.substring(0, textarea.selectionStart);
        return text.split('\n').length - 1;
    }, []);

    const handleKeyDown = (e) => {
        // Ctrl+Enter or F9 = GO
        if ((e.key === 'Enter' && e.ctrlKey) || e.key === 'F9') {
            e.preventDefault();
            handleGo();
            return;
        }

        // F5 = duplicate current line to next empty line
        if (e.key === 'F5') {
            e.preventDefault();
            const textarea = textareaRef.current;
            if (!textarea) return;
            const lines = textarea.value.split('\n');
            const cursorPos = textarea.selectionStart;
            const currentLineIdx = textarea.value.substring(0, cursorPos).split('\n').length - 1;
            const currentLine = lines[currentLineIdx]?.trim();
            if (!currentLine) return;

            let insertIdx = -1;
            for (let i = currentLineIdx + 1; i < lines.length; i++) {
                if (!lines[i].trim()) {
                    insertIdx = i;
                    break;
                }
            }

            if (insertIdx >= 0) {
                lines[insertIdx] = currentLine;
            } else {
                lines.push(currentLine);
            }

            const newValue = lines.join('\n');
            setExpression(newValue);
            const targetIdx = insertIdx >= 0 ? insertIdx : lines.length - 1;
            const newPos = lines.slice(0, targetIdx).join('\n').length + 1;
            setTimeout(() => {
                textarea.setSelectionRange(newPos, newPos + currentLine.length);
                textarea.focus();
            }, 0);
            return;
        }

        // Ctrl+T = toggle right axis for current line
        if (e.key === 't' && e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            const lineIdx = getCurrentLineIndex();
            setRightAxisLines(prev => {
                const next = new Set(prev);
                if (next.has(lineIdx)) {
                    next.delete(lineIdx);
                } else {
                    next.add(lineIdx);
                }
                // Update ref immediately so handleGo sees it
                rightAxisRef.current = next;
                return next;
            });
            // Trigger recalc after state settles
            setPendingRecalc(c => c + 1);
            return;
        }
    };

    const lines = expression.split('\n');

    return (
        <div className="expression-panel">
            <div className="expression-controls">
                <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start"
                    className="expression-input small"
                    title="Start date: YYYY-MM-DD, 10jan20, -1y, -6m, ytd, mtd"
                />
                <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End"
                    className="expression-input small"
                    title="End date: YYYY-MM-DD, 10jan20, -1y, -6m, ytd, today"
                />
                <input
                    type="text"
                    value={plotTitle}
                    onChange={(e) => setPlotTitle(e.target.value)}
                    placeholder="Title"
                    className="expression-input title"
                />
                <button
                    className="win-button go-button"
                    onClick={handleGo}
                    disabled={isEvaluating}
                >
                    {isEvaluating ? '...' : 'GO'}
                </button>
            </div>

            <ZoomRangeDisplay />

            {error && <div style={{ color: 'red', fontSize: '10px', padding: '2px' }}>{error}</div>}

            <div className="expression-editor-wrapper">
                <div className="expression-line-indicators">
                    {lines.map((_, i) => (
                        <div key={i} className={`line-indicator ${rightAxisLines.has(i) ? 'on-right' : ''}`}>
                            {rightAxisLines.has(i) ? 'R' : ''}
                        </div>
                    ))}
                </div>
                <div className="expression-editor">
                    <textarea
                        ref={textareaRef}
                        className="expression-textarea"
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter expressions (one per line). F9 = evaluate. Ctrl+T = right axis. F5 = duplicate line."
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default ExpressionPanel;
