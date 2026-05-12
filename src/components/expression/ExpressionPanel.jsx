import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { evaluateMultiline } from '../../services/expression/evaluator.js';
import { useDataStore } from '../../store/dataStore.js';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';
import { getSeriesColor } from '../../services/chart/colors.js';
import { registry } from '../../services/functions/registry.js';
import { parseDateInput } from '../../services/dates/normalize.js';
import { withStats } from '../../services/stats/withStats.js';
import { tokenize, TokenType } from '../../services/expression/tokenizer.js';

// Render a single line as syntax-highlighted spans. Robust to tokenize errors —
// falls back to plain text when the line contains unfinished tokens.
function highlightLine(line, knownNames) {
    if (!line) return '​'; // zero-width so the line still has height
    let tokens;
    try {
        tokens = tokenize(line, knownNames);
    } catch {
        return line;
    }
    const out = [];
    let pos = 0;
    const knownFnSet = new Set(registry.list().map(n => n.toLowerCase()));
    for (const t of tokens) {
        if (t.type === TokenType.EOF) break;
        // Emit any skipped whitespace verbatim
        if (t.pos > pos) out.push({ cls: 'sx-ws', text: line.slice(pos, t.pos) });
        let text = String(t.value);
        let cls = 'sx-default';
        if (t.type === TokenType.NUMBER) {
            text = line.slice(t.pos, t.pos + String(t.value).length);
            // Find actual end of the numeric token from source
            let endP = t.pos;
            while (endP < line.length && /[0-9eE+\-.]/.test(line[endP])) endP++;
            text = line.slice(t.pos, endP);
            cls = 'sx-number';
            pos = endP;
            out.push({ cls, text });
            continue;
        } else if (t.type === TokenType.STRING) {
            // Reconstruct quotes from the original line
            const startCh = line[t.pos];
            let endP = t.pos + 1;
            while (endP < line.length && line[endP] !== startCh) {
                if (line[endP] === '\\') endP++;
                endP++;
            }
            endP = Math.min(endP + 1, line.length);
            text = line.slice(t.pos, endP);
            cls = 'sx-string';
            pos = endP;
            out.push({ cls, text });
            continue;
        } else if (t.type === TokenType.IDENTIFIER) {
            text = t.value;
            cls = knownFnSet.has(text.toLowerCase()) ? 'sx-fn' : 'sx-ident';
        } else if (t.type === TokenType.OPERATOR) {
            cls = 'sx-op';
        } else if (t.type === TokenType.LPAREN || t.type === TokenType.RPAREN) {
            cls = 'sx-paren';
        } else if (t.type === TokenType.COMMA) {
            cls = 'sx-punct';
        } else if (t.type === TokenType.EQUALS) {
            cls = 'sx-op';
        } else if (t.type === TokenType.SEMICOLON) {
            cls = 'sx-punct';
        }
        pos = t.pos + text.length;
        out.push({ cls, text });
    }
    if (pos < line.length) out.push({ cls: 'sx-ws', text: line.slice(pos) });
    return out;
}

// Filter a series to the applied date window and recompute stats over that window.
// Returns the original series untouched if no window is set.
function filterAndRestat(series, startStr, endStr) {
    if (!series?.dates || !series?.values) return series;
    if (!startStr && !endStr) return series;
    const start = startStr ? parseDateInput(startStr) : null;
    const end = endStr ? parseDateInput(endStr) : null;
    if (!start && !end) return series;

    const dates = [];
    const values = [];
    for (let i = 0; i < series.dates.length; i++) {
        const d = new Date(series.dates[i]);
        if (isNaN(d.getTime())) continue;
        if (start && d < start) continue;
        if (end && d > end) continue;
        dates.push(series.dates[i]);
        values.push(series.values[i]);
    }
    // Recompute stats on the filtered window so AR/Vol/Sharpe/MaxDD reflect the
    // user's chosen time horizon.
    return withStats({ ...series, dates, values });
}

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

const ExpressionPanel = () => {
    // Expression text stored per-plot in plotStore
    const expression = usePlotStore(s => s.plots[s.activePlotId]?.expressions || '');
    const evaluationToken = usePlotStore(s => s.evaluationToken);
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
    const [autocomplete, setAutocomplete] = useState(null); // { tokenStart, query, items, selected }
    const rightAxisRef = useRef(rightAxisLines);
    const textareaRef = useRef(null);
    const { setSeriesMap, clearAll } = useDataStore();
    const { plotTitle, setPlotTitle, startDate, setStartDate, endDate, setEndDate } = useAppStore();
    const showLineNumbers = useAppStore(s => s.showLineNumbers);

    // Compile suggestion pool from cache + function registry
    const seriesCache = useDataStore(s => s.seriesCache);
    const suggestionPool = useMemo(() => {
        const cacheKeys = Object.keys(seriesCache);
        const fnNames = registry.list();
        const items = [
            ...fnNames.map(n => ({ label: n, kind: 'fn' })),
            ...cacheKeys.map(n => ({ label: n, kind: 'series' })),
        ];
        // Dedup case-insensitively while preserving original casing
        const seen = new Set();
        return items.filter(i => {
            const k = i.label.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }, [seriesCache]);

    const updateAutocomplete = useCallback((text, caretPos) => {
        // Find the identifier-like token immediately before the caret.
        // Stop at whitespace, parens, commas, operators, quotes.
        const left = text.slice(0, caretPos);
        const m = left.match(/[A-Za-z_][A-Za-z0-9_.]*$/);
        if (!m || m[0].length < 2) {
            setAutocomplete(null);
            return;
        }
        const query = m[0].toLowerCase();
        const items = suggestionPool
            .filter(it => it.label.toLowerCase().includes(query))
            .sort((a, b) => {
                // Prefer prefix matches
                const ap = a.label.toLowerCase().startsWith(query) ? 0 : 1;
                const bp = b.label.toLowerCase().startsWith(query) ? 0 : 1;
                if (ap !== bp) return ap - bp;
                return a.label.length - b.label.length;
            })
            .slice(0, 8);
        if (items.length === 0) {
            setAutocomplete(null);
            return;
        }
        setAutocomplete({ tokenStart: caretPos - m[0].length, query, items, selected: 0 });
    }, [suggestionPool]);

    const acceptAutocomplete = useCallback((indexOverride = null) => {
        if (!autocomplete) return false;
        const idx = indexOverride ?? autocomplete.selected;
        const pick = autocomplete.items[idx];
        if (!pick) return false;
        const textarea = textareaRef.current;
        if (!textarea) return false;
        const before = textarea.value.slice(0, autocomplete.tokenStart);
        const after = textarea.value.slice(textarea.selectionStart);
        const insert = pick.kind === 'fn' ? `${pick.label}(` : pick.label;
        const newValue = before + insert + after;
        setExpression(newValue);
        setAutocomplete(null);
        // Position caret after the inserted text
        setTimeout(() => {
            const pos = before.length + insert.length;
            textarea.setSelectionRange(pos, pos);
            textarea.focus();
        }, 0);
        return true;
    }, [autocomplete]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    // Apply the user's date window AND recompute stats over it,
                    // so the stats table reflects the chosen time horizon.
                    const windowed = filterAndRestat(result, startDate, endDate);
                    const color = getSeriesColor(i);
                    const config = { onRight: currentRightAxis.has(i) };
                    newMap[windowed.name] = {
                        ...windowed,
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

    // React to external evaluation requests (F9 command, toolbar GO, etc.)
    useEffect(() => {
        if (evaluationToken > 0) {
            handleGo();
        }
    }, [evaluationToken]); // eslint-disable-line react-hooks/exhaustive-deps

    // Get current line number from cursor position
    const getCurrentLineIndex = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return 0;
        const text = textarea.value.substring(0, textarea.selectionStart);
        return text.split('\n').length - 1;
    }, []);

    const handleKeyDown = (e) => {
        // Autocomplete navigation takes precedence when popup is open
        if (autocomplete) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setAutocomplete(prev => prev && { ...prev, selected: Math.min(prev.selected + 1, prev.items.length - 1) });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setAutocomplete(prev => prev && { ...prev, selected: Math.max(prev.selected - 1, 0) });
                return;
            }
            if (e.key === 'Tab' || (e.key === 'Enter' && !e.ctrlKey)) {
                e.preventDefault();
                acceptAutocomplete();
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setAutocomplete(null);
                return;
            }
        }

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

    // Known names for syntax-highlighting tokenizer (cache + assigned names)
    const highlightKnownNames = useMemo(
        () => Object.keys(useDataStore.getState().seriesCache),
        // re-fetch when cache changes (selector below re-renders)
        [seriesCache] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // Sync the highlight overlay's scroll position with the textarea
    const highlightRef = useRef(null);
    const handleEditorScroll = useCallback((e) => {
        if (highlightRef.current) {
            highlightRef.current.scrollTop = e.target.scrollTop;
            highlightRef.current.scrollLeft = e.target.scrollLeft;
        }
    }, []);

    const applyPreset = (start, end = '') => {
        setStartDate(start);
        setEndDate(end);
        // Defer so the appStore commit lands before evaluation reads it
        setTimeout(() => usePlotStore.getState().requestEvaluation(), 0);
    };

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
                <div className="date-presets">
                    <button className="date-preset-btn" onClick={() => applyPreset('-1m')} title="Last 1 month">1M</button>
                    <button className="date-preset-btn" onClick={() => applyPreset('-3m')} title="Last 3 months">3M</button>
                    <button className="date-preset-btn" onClick={() => applyPreset('-6m')} title="Last 6 months">6M</button>
                    <button className="date-preset-btn" onClick={() => applyPreset('ytd')} title="Year to date">YTD</button>
                    <button className="date-preset-btn" onClick={() => applyPreset('-1y')} title="Last 1 year">1Y</button>
                    <button className="date-preset-btn" onClick={() => applyPreset('-5y')} title="Last 5 years">5Y</button>
                    <button className="date-preset-btn" onClick={() => applyPreset('', '')} title="All data">MAX</button>
                </div>
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
                {showLineNumbers && (
                    <div className="expression-line-indicators">
                        {lines.map((_, i) => (
                            <div key={i} className={`line-indicator ${rightAxisLines.has(i) ? 'on-right' : ''}`}>
                                <span className="line-number">{i + 1}</span>
                                {rightAxisLines.has(i) && <span className="line-r">R</span>}
                            </div>
                        ))}
                    </div>
                )}
                <div className="expression-editor" style={{ position: 'relative' }}>
                    <pre ref={highlightRef} className="expression-highlight" aria-hidden="true">
                        {lines.map((line, lineIdx) => {
                            const tokens = highlightLine(line, highlightKnownNames);
                            return (
                                <div key={lineIdx} className="sx-line">
                                    {typeof tokens === 'string'
                                        ? tokens
                                        : tokens.map((t, ti) => (
                                            <span key={ti} className={t.cls}>{t.text}</span>
                                        ))}
                                </div>
                            );
                        })}
                    </pre>
                    <textarea
                        ref={textareaRef}
                        className="expression-textarea"
                        value={expression}
                        onChange={(e) => {
                            setExpression(e.target.value);
                            updateAutocomplete(e.target.value, e.target.selectionStart);
                        }}
                        onScroll={handleEditorScroll}
                        onKeyUp={(e) => {
                            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                                updateAutocomplete(e.target.value, e.target.selectionStart);
                            }
                        }}
                        onBlur={() => setTimeout(() => setAutocomplete(null), 150)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter expressions (one per line). F9 = evaluate. Ctrl+T = right axis. F5 = duplicate line."
                        spellCheck={false}
                    />
                    {autocomplete && (
                        <div className="autocomplete-popup">
                            {autocomplete.items.map((it, i) => (
                                <div
                                    key={it.label}
                                    className={`autocomplete-item ${i === autocomplete.selected ? 'selected' : ''}`}
                                    onMouseDown={(e) => { e.preventDefault(); acceptAutocomplete(i); }}
                                >
                                    <span className={`autocomplete-kind kind-${it.kind}`}>{it.kind === 'fn' ? 'ƒ' : '∿'}</span>
                                    <span className="autocomplete-label">{it.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpressionPanel;
