// Command Registry - centralized action dispatch for menus, toolbar, and keyboard shortcuts

class CommandRegistry {
    constructor() {
        this.commands = {};
        this.listeners = new Set();
    }

    register(id, config) {
        this.commands[id] = {
            id,
            label: config.label || id,
            shortcut: config.shortcut || null,
            handler: config.handler || (() => {}),
            enabled: config.enabled !== undefined ? config.enabled : () => true,
            checked: config.checked || null,
            group: id.split('.')[0],
        };
    }

    execute(id, ...args) {
        const cmd = this.commands[id];
        if (!cmd) {
            console.warn(`Command not found: ${id}`);
            return;
        }
        const isEnabled = typeof cmd.enabled === 'function' ? cmd.enabled() : cmd.enabled;
        if (!isEnabled) return;
        try {
            cmd.handler(...args);
        } catch (err) {
            console.error(`Command ${id} failed:`, err);
        }
        this.notifyListeners(id);
    }

    get(id) {
        return this.commands[id] || null;
    }

    getByGroup(group) {
        return Object.values(this.commands).filter(c => c.group === group);
    }

    isEnabled(id) {
        const cmd = this.commands[id];
        if (!cmd) return false;
        return typeof cmd.enabled === 'function' ? cmd.enabled() : cmd.enabled;
    }

    isChecked(id) {
        const cmd = this.commands[id];
        if (!cmd || !cmd.checked) return false;
        return typeof cmd.checked === 'function' ? cmd.checked() : cmd.checked;
    }

    onChange(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners(id) {
        this.listeners.forEach(fn => fn(id));
    }

    list() {
        return Object.values(this.commands);
    }
}

export const commandRegistry = new CommandRegistry();

// Register all application commands
export function registerAllCommands(appStore, dataStore, plotStore) {
    const getApp = () => appStore.getState();
    const getData = () => dataStore.getState();
    const getPlot = () => plotStore?.getState();

    const setStatus = (msg) => {
        appStore.setState({ statusMessage: msg });
        setTimeout(() => appStore.setState({ statusMessage: 'For Help, press F1' }), 3000);
    };

    // === FILE ===
    commandRegistry.register('file.new', {
        label: 'New',
        shortcut: 'Ctrl+N',
        handler: () => {
            if (getPlot()) {
                getPlot().addPlot();
                setStatus('New plot created');
            }
        }
    });
    commandRegistry.register('file.open', {
        label: 'Open Folder...',
        handler: async () => {
            if (window.electron?.dialog) {
                const dir = await window.electron.dialog.openDirectory();
                if (dir) {
                    getApp().setRootPath(dir);
                    setStatus(`Opened: ${dir}`);
                }
            }
        }
    });
    // Shared workspace-write helper — saves to a known path, updates recents.
    const writeWorkspaceTo = async (path) => {
        const { serializeWorkspace } = await import('../workspace/serializer.js');
        const data = serializeWorkspace(getPlot(), getApp());
        await window.electron.fs.writeFile(path, JSON.stringify(data, null, 2));
        const recent = [path, ...(getApp().recentFiles || []).filter(p => p !== path)].slice(0, 6);
        appStore.setState({ recentFiles: recent, currentWorkspacePath: path });
        try { localStorage.setItem('recentFiles', JSON.stringify(recent)); } catch { /* ignore */ }
        setStatus(`Workspace saved: ${path}`);
    };

    commandRegistry.register('file.openWorkspace', {
        label: 'Open Workspace...',
        shortcut: 'Ctrl+O',
        handler: async (preselectedPath = null) => {
            try {
                let filePath = preselectedPath;
                if (!filePath) {
                    if (!window.electron?.dialog?.openFile) return;
                    filePath = await window.electron.dialog.openFile({
                        filters: [
                            { name: 'DataVis Workspace', extensions: ['ptw'] },
                            { name: 'All Files', extensions: ['*'] },
                        ]
                    });
                }
                if (!filePath) return;
                const { loadWorkspaceFromPath } = await import('../workspace/serializer.js');
                await loadWorkspaceFromPath(filePath);
                setStatus(`Workspace loaded: ${filePath}`);
            } catch (err) {
                console.error('Failed to open workspace', err);
                setStatus(`Open failed: ${err.message}`);
            }
        }
    });

    commandRegistry.register('file.save', {
        label: 'Save',
        shortcut: 'Ctrl+S',
        handler: async () => {
            if (!getPlot()) return;
            const current = getApp().currentWorkspacePath;
            if (current && window.electron?.fs?.writeFile) {
                try { await writeWorkspaceTo(current); }
                catch (err) { setStatus(`Save failed: ${err.message}`); }
                return;
            }
            // Fallback: act as Save As
            commandRegistry.execute('file.saveAs');
        }
    });

    commandRegistry.register('file.saveAs', {
        label: 'Save As...',
        shortcut: 'Ctrl+Shift+S',
        handler: async () => {
            if (!window.electron?.dialog?.saveFile || !getPlot()) return;
            try {
                const path = await window.electron.dialog.saveFile({
                    filters: [{ name: 'DataVis Workspace', extensions: ['ptw'] }]
                });
                if (path) await writeWorkspaceTo(path);
            } catch (err) {
                setStatus(`Save As failed: ${err.message}`);
            }
        }
    });

    commandRegistry.register('file.saveWorkspace', {
        label: 'Save Workspace',
        handler: () => commandRegistry.execute('file.saveAs')
    });
    commandRegistry.register('file.exportImage', {
        label: 'Export Image...',
        handler: async () => {
            if (!window.electron?.dialog?.saveFile) return;
            try {
                const path = await window.electron.dialog.saveFile({
                    filters: [
                        { name: 'PNG Image', extensions: ['png'] },
                        { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
                        { name: 'SVG Vector', extensions: ['svg'] },
                    ]
                });
                if (!path) return;
                const ext = path.split('.').pop().toLowerCase();
                const format = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : (ext === 'svg' ? 'svg' : 'png');
                if (getPlot()) {
                    getPlot().requestChartAction('exportImage', { path, format });
                    setStatus(`Exporting ${format.toUpperCase()}...`);
                }
            } catch (err) {
                setStatus(`Export failed: ${err.message}`);
            }
        }
    });

    commandRegistry.register('file.exportData', {
        label: 'Export Data...',
        handler: async () => {
            if (!window.electron?.dialog?.saveFile || !window.electron?.fs?.writeFile) return;
            const series = Object.values(getData().seriesMap);
            if (series.length === 0) {
                setStatus('No data to export');
                return;
            }
            try {
                const path = await window.electron.dialog.saveFile({
                    filters: [
                        { name: 'CSV (comma)', extensions: ['csv'] },
                        { name: 'TSV (tab)', extensions: ['tsv', 'txt'] },
                    ]
                });
                if (!path) return;
                const useTab = /\.(tsv|txt)$/i.test(path);
                const sep = useTab ? '\t' : ',';
                const { dateAlignMultiple } = await import('../expression/dateAlign.js');
                const aligned = dateAlignMultiple(series);
                const names = Object.keys(aligned.columns);
                const escape = (v) => {
                    if (v === null || v === undefined) return '';
                    const s = String(v);
                    if (useTab) return s;
                    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                };
                let text = ['Date', ...names].map(escape).join(sep) + '\n';
                for (let i = 0; i < aligned.dates.length; i++) {
                    const row = [aligned.dates[i], ...names.map(n => aligned.columns[n][i] ?? '')];
                    text += row.map(escape).join(sep) + '\n';
                }
                await window.electron.fs.writeFile(path, text);
                setStatus(`Exported ${aligned.dates.length} rows to ${path}`);
            } catch (err) {
                setStatus(`Export failed: ${err.message}`);
            }
        }
    });

    // Backwards-compat alias
    commandRegistry.register('file.exportGif', {
        label: 'Export Image...',
        handler: () => commandRegistry.execute('file.exportImage')
    });
    commandRegistry.register('file.print', {
        label: 'Print...',
        shortcut: 'Ctrl+P',
        handler: () => {
            if (window.electron?.window?.print) {
                window.electron.window.print();
            } else {
                window.print();
            }
        }
    });
    commandRegistry.register('file.printPreview', { label: 'Print Preview', handler: () => setStatus('Print Preview not implemented'), enabled: () => false });
    commandRegistry.register('file.printSetup', { label: 'Print Setup...', handler: () => setStatus('Print Setup not implemented'), enabled: () => false });
    commandRegistry.register('file.plotProperties', { label: 'Plot Properties', handler: () => setStatus('Plot Properties not implemented'), enabled: () => false });
    commandRegistry.register('file.exit', {
        label: 'Exit',
        handler: () => {
            if (window.electron?.window?.close) window.electron.window.close();
        }
    });

    // === EDIT ===
    commandRegistry.register('edit.undo', {
        label: 'Undo',
        shortcut: 'Ctrl+Z',
        handler: () => {
            if (getPlot()) getPlot().undoExpression();
        }
    });
    commandRegistry.register('edit.cut', { label: 'Cut', shortcut: 'Ctrl+X', handler: () => document.execCommand('cut') });
    commandRegistry.register('edit.copy', { label: 'Copy', shortcut: 'Ctrl+C', handler: () => document.execCommand('copy') });
    commandRegistry.register('edit.copyGraphics', {
        label: 'Copy Graphics',
        shortcut: 'Ctrl+Shift+C',
        handler: () => {
            if (getPlot()) getPlot().requestChartAction('copyGraphics');
        }
    });
    commandRegistry.register('edit.copyData', {
        label: 'Copy Data',
        shortcut: 'Ctrl+Shift+D',
        handler: async () => {
            const series = Object.values(getData().seriesMap);
            if (series.length === 0) return;
            const { dateAlignMultiple } = await import('../expression/dateAlign.js');
            const aligned = dateAlignMultiple(series);
            const names = Object.keys(aligned.columns);
            let text = 'Date\t' + names.join('\t') + '\n';
            for (let i = 0; i < aligned.dates.length; i++) {
                const row = [aligned.dates[i], ...names.map(n => aligned.columns[n][i] ?? '')];
                text += row.join('\t') + '\n';
            }
            navigator.clipboard.writeText(text);
            setStatus('Data copied to clipboard');
        }
    });
    commandRegistry.register('edit.paste', { label: 'Paste', shortcut: 'Ctrl+V', handler: () => document.execCommand('paste') });
    commandRegistry.register('edit.exprProperties', { label: 'Expr Properties', handler: () => setStatus('Not implemented'), enabled: () => false });
    commandRegistry.register('edit.sortExpressions', {
        label: 'Sort Expressions',
        handler: () => {
            const plot = getPlot()?.getActivePlot();
            if (!plot) return;
            const lines = (plot.expressions || '').split('\n').filter(l => l.trim());
            lines.sort((a, b) => a.localeCompare(b));
            getPlot().updatePlot(plot.id, { expressions: lines.join('\n') });
            setStatus('Expressions sorted');
        }
    });
    commandRegistry.register('edit.find', {
        label: 'Find',
        shortcut: 'Ctrl+F',
        handler: () => appStore.setState({ activeDialog: 'findReplace' })
    });
    commandRegistry.register('edit.replace', {
        label: 'Replace',
        shortcut: 'Ctrl+R',
        handler: () => appStore.setState({ activeDialog: 'findReplace' })
    });
    commandRegistry.register('edit.duplicatePlot', {
        label: 'Duplicate Plot',
        handler: () => {
            if (getPlot()) {
                getPlot().duplicatePlot();
                setStatus('Plot duplicated');
            }
        }
    });

    // === VIEW ===
    commandRegistry.register('view.zoomBackOut', {
        label: 'Zoom Back Out',
        handler: () => {
            if (getPlot()) getPlot().requestChartAction('zoomBackOut');
        }
    });
    commandRegistry.register('view.zoomToDataStart', {
        label: 'Zoom to Data Start',
        handler: () => { if (getPlot()) getPlot().requestChartAction('zoomToDataStart'); }
    });
    commandRegistry.register('view.zoomInABit', {
        label: 'Zoom In a Bit',
        handler: () => { if (getPlot()) getPlot().requestChartAction('zoomIn'); }
    });
    commandRegistry.register('view.zoomOutABit', {
        label: 'Zoom Out a Bit',
        handler: () => { if (getPlot()) getPlot().requestChartAction('zoomOut'); }
    });
    commandRegistry.register('view.flatten', {
        label: 'Flatten (reset axes)',
        handler: () => {
            const plot = getPlot()?.getActivePlot();
            if (!plot) return;
            getPlot().updatePlot(plot.id, { axisConfig: {} });
            getPlot().requestChartAction('zoomBackOut');
            setStatus('Axes reset to auto');
        }
    });
    commandRegistry.register('view.mergeVisiblePlots', {
        label: 'Merge Visible Plots',
        handler: () => {
            const ps = getPlot();
            if (!ps) return;
            const allExpressions = ps.plotOrder
                .map(id => ps.plots[id]?.expressions || '')
                .filter(Boolean)
                .join('\n');
            ps.updatePlot(ps.activePlotId, { expressions: allExpressions });
            ps.requestEvaluation();
            setStatus('Merged all plot expressions into current plot');
        }
    });
    commandRegistry.register('view.sameDatesEverywhere', {
        label: 'Same Dates Everywhere',
        handler: () => {
            const startDate = getApp().startDate;
            const endDate = getApp().endDate;
            const ps = getPlot();
            if (!ps) return;
            const updates = {};
            for (const id of ps.plotOrder) {
                updates[id] = { ...ps.plots[id], startDate, endDate };
            }
            // Apply to all plots
            for (const id of ps.plotOrder) ps.updatePlot(id, { startDate, endDate });
            setStatus(`Applied date range to ${ps.plotOrder.length} plot(s)`);
        }
    });
    commandRegistry.register('view.gotoNextFolder', { label: 'Goto Next Folder', shortcut: 'Ctrl+Shift+PgDn', handler: () => setStatus('Tree navigation not implemented'), enabled: () => false });
    commandRegistry.register('view.gotoPrevFolder', { label: 'Goto Prev Folder', shortcut: 'Ctrl+Shift+PgUp', handler: () => setStatus('Tree navigation not implemented'), enabled: () => false });
    commandRegistry.register('view.gotoNextFile', { label: 'Goto Next File', shortcut: 'PgDn', handler: () => setStatus('Tree navigation not implemented'), enabled: () => false });
    commandRegistry.register('view.gotoPrevFile', { label: 'Goto Prev File', shortcut: 'PgUp', handler: () => setStatus('Tree navigation not implemented'), enabled: () => false });
    commandRegistry.register('view.toggleMainToolbar', {
        label: 'Main ToolBar',
        handler: () => appStore.setState(s => ({ showMainToolbar: !s.showMainToolbar })),
        checked: () => getApp().showMainToolbar
    });
    commandRegistry.register('view.toggleExpressionTools', {
        label: 'Expression Tools',
        handler: () => appStore.setState(s => ({ showExpressionTools: !s.showExpressionTools })),
        checked: () => getApp().showExpressionTools
    });
    commandRegistry.register('view.togglePlotTools', {
        label: 'Plot Tools',
        handler: () => appStore.setState(s => ({ showPlotTools: !s.showPlotTools })),
        checked: () => getApp().showPlotTools
    });
    commandRegistry.register('view.toggleStudyBar', {
        label: 'Study Bar',
        handler: () => appStore.setState(s => ({ showStudyBar: !s.showStudyBar })),
        checked: () => getApp().showStudyBar
    });
    commandRegistry.register('view.showExpressionWindow', {
        label: 'Show Expression Window',
        handler: () => appStore.setState(s => ({ showExpressionWindow: !s.showExpressionWindow })),
        checked: () => getApp().showExpressionWindow
    });

    // === INSERT ===
    commandRegistry.register('insert.browseSymbol', {
        label: 'Browse Symbol...',
        shortcut: 'Ctrl+Shift+F',
        handler: () => appStore.setState({ activeDialog: 'browseSymbol' })
    });
    commandRegistry.register('insert.favorites', { label: 'My Favorite Symbols', handler: () => appStore.setState({ activeDialog: 'favoritesManager' }) });
    commandRegistry.register('insert.function', {
        label: 'Function',
        shortcut: 'F4',
        handler: () => appStore.setState({ activeDialog: 'functionInsert' })
    });
    commandRegistry.register('insert.label', {
        label: 'Label',
        handler: () => {
            const app = getApp();
            const x = app.hoverDate;
            const y = app.hoverValue;
            if (x == null || y == null) {
                setStatus('Hover over the chart first, then Insert > Label');
                return;
            }
            const text = prompt('Label text:');
            if (text && text.trim()) {
                getPlot()?.addAnnotation({ x, y, text: text.trim(), color: '#cc0000' });
                setStatus('Label added');
            }
        }
    });
    commandRegistry.register('insert.clearLabels', {
        label: 'Clear All Labels',
        handler: () => {
            getPlot()?.clearAnnotations();
            setStatus('All labels cleared');
        }
    });

    // === FORMAT ===
    commandRegistry.register('format.axes', {
        label: 'Axes...',
        handler: () => appStore.setState({ activeDialog: 'axes' })
    });
    commandRegistry.register('format.titles', {
        label: 'Titles...',
        handler: () => appStore.setState({ activeDialog: 'titles' })
    });
    commandRegistry.register('format.plotType.timeSeries', {
        label: 'Time Series',
        handler: () => { if (getPlot()) getPlot().setPlotType('timeseries'); },
        checked: () => getPlot()?.getActivePlot()?.plotType === 'timeseries'
    });
    commandRegistry.register('format.plotType.histogram', {
        label: 'Histogram',
        handler: () => { if (getPlot()) getPlot().setPlotType('histogram'); },
        checked: () => getPlot()?.getActivePlot()?.plotType === 'histogram'
    });
    commandRegistry.register('format.plotType.scatter', {
        label: 'Scatter Plot',
        handler: () => { if (getPlot()) getPlot().setPlotType('scatter'); },
        checked: () => getPlot()?.getActivePlot()?.plotType === 'scatter'
    });
    commandRegistry.register('format.plotType.pie', {
        label: 'Pie Chart',
        handler: () => { if (getPlot()) getPlot().setPlotType('pie'); },
        checked: () => getPlot()?.getActivePlot()?.plotType === 'pie'
    });
    commandRegistry.register('format.fonts', {
        label: 'Fonts...',
        handler: () => appStore.setState({ activeDialog: 'plotStyle', plotStyleInitialTab: 'fonts' })
    });
    commandRegistry.register('format.margins', {
        label: 'Margins...',
        handler: () => appStore.setState({ activeDialog: 'plotStyle', plotStyleInitialTab: 'margins' })
    });
    commandRegistry.register('format.background', {
        label: 'Background...',
        handler: () => appStore.setState({ activeDialog: 'plotStyle', plotStyleInitialTab: 'background' })
    });
    commandRegistry.register('format.decimals', { label: 'Decimals', handler: () => setStatus('Use Tools > Options for decimals'), enabled: () => false });
    commandRegistry.register('format.currencyCode', { label: 'Currency Code', handler: () => setStatus('Currency suffix not implemented'), enabled: () => false });
    commandRegistry.register('format.onRight', {
        label: 'On Right',
        shortcut: 'Ctrl+T',
        handler: () => {
            if (getPlot()) getPlot().toggleSelectedSeriesConfig('onRight');
            setStatus('Toggled right axis');
        }
    });
    commandRegistry.register('format.disabled', {
        label: 'Disabled',
        shortcut: 'Ctrl+B',
        handler: () => {
            if (getPlot()) getPlot().toggleSelectedSeriesConfig('disabled');
            setStatus('Toggled disabled');
        }
    });
    commandRegistry.register('format.hidden', {
        label: 'Hidden',
        shortcut: 'Ctrl+H',
        handler: () => {
            if (getPlot()) getPlot().toggleSelectedSeriesConfig('hidden');
            setStatus('Toggled hidden');
        }
    });
    commandRegistry.register('format.color', {
        label: 'Color...',
        shortcut: 'Alt+C',
        handler: () => appStore.setState({ activeDialog: 'colorPicker' })
    });

    // === TOOLS ===
    commandRegistry.register('tools.study', { label: 'Study', handler: () => appStore.setState(s => ({ showStudyBar: !s.showStudyBar })) });
    commandRegistry.register('tools.eraseAllLines', {
        label: 'Erase All Lines',
        handler: () => {
            getData().clearAll();
            setStatus('All series cleared');
        }
    });
    commandRegistry.register('tools.recalculatePlot', {
        label: 'Recalculate Plot',
        shortcut: 'F9',
        handler: () => {
            if (getPlot()) getPlot().requestEvaluation();
        }
    });
    commandRegistry.register('tools.recalculateFolder', { label: 'Recalculate Folder', shortcut: 'Alt+F5', handler: () => setStatus('Recalculate folder not implemented'), enabled: () => false });
    commandRegistry.register('tools.recalculateFile', { label: 'Recalculate File', handler: () => setStatus('Recalculate file not implemented'), enabled: () => false });
    commandRegistry.register('tools.slangExamples', {
        label: 'Slang Examples',
        shortcut: 'F7',
        handler: () => appStore.setState({ activeDialog: 'studyPanel' })
    });
    commandRegistry.register('tools.options', {
        label: 'Options...',
        handler: () => appStore.setState({ activeDialog: 'options' })
    });

    // === DATA ===
    commandRegistry.register('data.view', {
        label: 'View',
        shortcut: 'Ctrl+U',
        handler: () => appStore.setState({ activeDialog: 'dataViewer', dataViewerMerged: false })
    });
    commandRegistry.register('data.viewMerged', {
        label: 'View Merged',
        shortcut: 'Ctrl+D',
        handler: () => appStore.setState({ activeDialog: 'dataViewer', dataViewerMerged: true })
    });
    commandRegistry.register('data.vitalStats', {
        label: 'Vital Stats',
        shortcut: 'Alt+A',
        handler: () => appStore.setState({ activeDialog: 'vitalStats' })
    });
    commandRegistry.register('data.cacheStats', {
        label: 'Cache Stats',
        handler: () => {
            const cache = getData().seriesCache || {};
            const names = Object.keys(cache);
            const totalPoints = names.reduce((sum, n) => sum + (cache[n].values?.length || 0), 0);
            const sizeMb = (totalPoints * 16 / 1024 / 1024).toFixed(2);
            setStatus(`Cache: ${names.length} series, ~${totalPoints.toLocaleString()} points (~${sizeMb} MB)`);
        }
    });
    commandRegistry.register('data.memoryUsage', {
        label: 'Memory Usage',
        handler: () => {
            if (performance.memory) {
                setStatus(`Memory: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`);
            } else {
                setStatus('Memory usage info not available');
            }
        }
    });
    commandRegistry.register('data.lastError', { label: 'Last Error', handler: () => setStatus(getData().error || 'No errors') });

    // === WINDOW ===
    commandRegistry.register('window.tile', { label: 'Tile', handler: () => setStatus('Multi-window tiling not implemented'), enabled: () => false });
    commandRegistry.register('window.autotile', { label: 'Autotile', handler: () => setStatus('Multi-window tiling not implemented'), enabled: () => false });
    commandRegistry.register('window.cascade', { label: 'Cascade', handler: () => setStatus('Multi-window tiling not implemented'), enabled: () => false });
    commandRegistry.register('window.arrangeIcons', { label: 'Arrange Icons', handler: () => setStatus('Not implemented'), enabled: () => false });

    // === HELP ===
    commandRegistry.register('help.topics', {
        label: 'Help Topics',
        shortcut: 'F1',
        handler: () => appStore.setState({ activeDialog: 'about' })
    });
    commandRegistry.register('help.acceleratorKeys', {
        label: 'Accelerator Keys',
        handler: () => appStore.setState({ activeDialog: 'acceleratorKeys' })
    });
    commandRegistry.register('help.tipOfDay', {
        label: 'Tip of the Day...',
        handler: () => appStore.setState({ activeDialog: 'tipOfDay' })
    });
    commandRegistry.register('help.about', {
        label: 'About DataVis...',
        handler: () => appStore.setState({ activeDialog: 'about' })
    });
}
