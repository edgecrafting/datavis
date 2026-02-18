import { create } from 'zustand';

// 2E: Use timestamp + random instead of module-level counter (survives HMR)
function generatePlotId() {
    return `plot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

let plotDisplayCounter = 1;

function createEmptyPlot(name) {
    const id = generatePlotId();
    return {
        id,
        name: name || `Plot ${plotDisplayCounter++}`,
        expressions: '',
        startDate: '',
        endDate: '',
        plotType: 'timeseries',
        seriesConfig: {},  // { seriesName: { color, onRight, disabled, hidden, lineWidth } }
    };
}

const initialPlot = createEmptyPlot('Plot 1');

export const usePlotStore = create((set, get) => ({
    plots: { [initialPlot.id]: initialPlot },
    activePlotId: initialPlot.id,
    plotOrder: [initialPlot.id],

    getActivePlot: () => {
        const state = get();
        return state.plots[state.activePlotId] || null;
    },

    addPlot: (name) => {
        const newPlot = createEmptyPlot(name);
        set(state => ({
            plots: { ...state.plots, [newPlot.id]: newPlot },
            plotOrder: [...state.plotOrder, newPlot.id],
            activePlotId: newPlot.id,
        }));
        return newPlot.id;
    },

    removePlot: (id) => {
        set(state => {
            const newPlots = { ...state.plots };
            delete newPlots[id];
            const newOrder = state.plotOrder.filter(pid => pid !== id);
            const newActive = state.activePlotId === id
                ? (newOrder[0] || null)
                : state.activePlotId;

            // If no plots remain, create a new empty one
            if (newOrder.length === 0) {
                const fresh = createEmptyPlot('Plot 1');
                return {
                    plots: { [fresh.id]: fresh },
                    plotOrder: [fresh.id],
                    activePlotId: fresh.id,
                };
            }

            return { plots: newPlots, plotOrder: newOrder, activePlotId: newActive };
        });
    },

    setActivePlot: (id) => set({ activePlotId: id }),

    renamePlot: (id, newName) => {
        set(state => ({
            plots: {
                ...state.plots,
                [id]: { ...state.plots[id], name: newName }
            }
        }));
    },

    updatePlot: (id, updates) => {
        set(state => ({
            plots: {
                ...state.plots,
                [id]: { ...state.plots[id], ...updates }
            }
        }));
    },

    setPlotType: (type) => {
        set(state => ({
            plots: {
                ...state.plots,
                [state.activePlotId]: { ...state.plots[state.activePlotId], plotType: type }
            }
        }));
    },

    // 2B: Insert text into the active plot's expressions field
    insertText: (text) => {
        set(state => {
            const plot = state.plots[state.activePlotId];
            if (!plot) return state;
            const current = plot.expressions;
            const newExpr = current && !current.endsWith('\n') ? current + '\n' + text : current + text;
            return {
                plots: {
                    ...state.plots,
                    [state.activePlotId]: { ...plot, expressions: newExpr }
                }
            };
        });
    },

    setSeriesConfig: (seriesName, config) => {
        set(state => {
            const plot = state.plots[state.activePlotId];
            if (!plot) return state;
            return {
                plots: {
                    ...state.plots,
                    [state.activePlotId]: {
                        ...plot,
                        seriesConfig: {
                            ...plot.seriesConfig,
                            [seriesName]: { ...(plot.seriesConfig[seriesName] || {}), ...config }
                        }
                    }
                }
            };
        });
    },

    toggleSelectedSeriesConfig: (property) => {
        set(state => {
            const plot = state.plots[state.activePlotId];
            if (!plot) return state;
            const newConfig = { ...plot.seriesConfig };
            for (const name of Object.keys(newConfig)) {
                newConfig[name] = { ...newConfig[name], [property]: !newConfig[name]?.[property] };
            }
            return {
                plots: {
                    ...state.plots,
                    [state.activePlotId]: { ...plot, seriesConfig: newConfig }
                }
            };
        });
    },

    // 3E: Undo/redo for expressions
    expressionHistory: {},  // { plotId: { entries: string[], index: number } }

    pushExpressionHistory: (plotId, text) => {
        set(state => {
            const hist = state.expressionHistory[plotId] || { entries: [''], index: 0 };
            // Don't push if same as current
            if (hist.entries[hist.index] === text) return state;
            // Truncate future entries after current index
            const entries = hist.entries.slice(0, hist.index + 1);
            entries.push(text);
            // Cap at 50 entries
            if (entries.length > 50) entries.shift();
            return {
                expressionHistory: {
                    ...state.expressionHistory,
                    [plotId]: { entries, index: entries.length - 1 }
                }
            };
        });
    },

    undoExpression: () => {
        const state = get();
        const plotId = state.activePlotId;
        const hist = state.expressionHistory[plotId];
        if (!hist || hist.index <= 0) return;
        const newIndex = hist.index - 1;
        set(s => ({
            expressionHistory: {
                ...s.expressionHistory,
                [plotId]: { ...hist, index: newIndex }
            },
            plots: {
                ...s.plots,
                [plotId]: { ...s.plots[plotId], expressions: hist.entries[newIndex] }
            }
        }));
    },

    redoExpression: () => {
        const state = get();
        const plotId = state.activePlotId;
        const hist = state.expressionHistory[plotId];
        if (!hist || hist.index >= hist.entries.length - 1) return;
        const newIndex = hist.index + 1;
        set(s => ({
            expressionHistory: {
                ...s.expressionHistory,
                [plotId]: { ...hist, index: newIndex }
            },
            plots: {
                ...s.plots,
                [plotId]: { ...s.plots[plotId], expressions: hist.entries[newIndex] }
            }
        }));
    },

    // 2E: Deep clone seriesConfig to prevent cross-mutation
    duplicatePlot: () => {
        const state = get();
        const active = state.plots[state.activePlotId];
        if (!active) return;
        const newPlot = createEmptyPlot(`${active.name} (Copy)`);
        newPlot.expressions = active.expressions;
        newPlot.startDate = active.startDate;
        newPlot.endDate = active.endDate;
        newPlot.plotType = active.plotType;
        newPlot.seriesConfig = JSON.parse(JSON.stringify(active.seriesConfig));
        set(s => ({
            plots: { ...s.plots, [newPlot.id]: newPlot },
            plotOrder: [...s.plotOrder, newPlot.id],
            activePlotId: newPlot.id,
        }));
    },
}));
