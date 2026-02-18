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
        label: 'Open...',
        shortcut: 'Ctrl+O',
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
    commandRegistry.register('file.save', {
        label: 'Save File',
        shortcut: 'Ctrl+S',
        handler: () => setStatus('Save: use File > Save Workspace for .ptw files')
    });
    commandRegistry.register('file.saveWorkspace', {
        label: 'Save Workspace',
        handler: async () => {
            if (window.electron?.dialog?.saveFile) {
                const path = await window.electron.dialog.saveFile({
                    filters: [{ name: 'Plottool Workspace', extensions: ['ptw'] }]
                });
                if (path && getPlot()) {
                    const { serializeWorkspace } = await import('../workspace/serializer.js');
                    const data = serializeWorkspace(getPlot(), getApp());
                    await window.electron.fs.writeFile(path, JSON.stringify(data, null, 2));
                    setStatus(`Workspace saved: ${path}`);
                    const recent = [...(getApp().recentFiles || [])];
                    if (!recent.includes(path)) {
                        recent.unshift(path);
                        if (recent.length > 6) recent.pop();
                        appStore.setState({ recentFiles: recent });
                        localStorage.setItem('recentFiles', JSON.stringify(recent));
                    }
                }
            }
        }
    });
    commandRegistry.register('file.exportGif', {
        label: 'Export to GIF',
        handler: () => setStatus('Export: right-click chart for image export')
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
    commandRegistry.register('file.printPreview', { label: 'Print Preview', handler: () => setStatus('Print Preview not yet available') });
    commandRegistry.register('file.printSetup', { label: 'Print Setup...', handler: () => setStatus('Print Setup not yet available') });
    commandRegistry.register('file.plotProperties', { label: 'Plot Properties', handler: () => setStatus('Plot Properties not yet available') });
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
            const plotEl = document.querySelector('.js-plotly-plot');
            if (plotEl) {
                import('plotly.js-basic-dist-min').then(Plotly => {
                    Plotly.default.toImage(plotEl, { format: 'png', width: 1200, height: 600 }).then(url => {
                        fetch(url).then(r => r.blob()).then(blob => {
                            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                            setStatus('Graphics copied to clipboard');
                        });
                    });
                });
            }
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
    commandRegistry.register('edit.exprProperties', { label: 'Expr Properties', handler: () => setStatus('Expression properties') });
    commandRegistry.register('edit.sortExpressions', { label: 'Sort Expressions', handler: () => setStatus('Sort expressions') });
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
            const plotEl = document.querySelector('.js-plotly-plot');
            if (plotEl) {
                import('plotly.js-basic-dist-min').then(Plotly => {
                    Plotly.default.relayout(plotEl, { 'xaxis.autorange': true, 'yaxis.autorange': true });
                });
            }
        }
    });
    commandRegistry.register('view.zoomToDataStart', { label: 'Zoom to Data Start', handler: () => setStatus('Zoom to Data Start') });
    commandRegistry.register('view.zoomInABit', { label: 'Zoom In a Bit', handler: () => setStatus('Zoom In') });
    commandRegistry.register('view.zoomOutABit', { label: 'Zoom Out a Bit', handler: () => setStatus('Zoom Out') });
    commandRegistry.register('view.flatten', { label: 'Flatten', handler: () => setStatus('Flatten view') });
    commandRegistry.register('view.mergeVisiblePlots', { label: 'Merge Visible Plots', handler: () => setStatus('Merge visible plots') });
    commandRegistry.register('view.sameDatesEverywhere', { label: 'Same Dates Everywhere', handler: () => setStatus('Same dates everywhere') });
    commandRegistry.register('view.gotoNextFolder', { label: 'Goto Next Folder', shortcut: 'Ctrl+Shift+PgDn', handler: () => setStatus('Next folder') });
    commandRegistry.register('view.gotoPrevFolder', { label: 'Goto Prev Folder', shortcut: 'Ctrl+Shift+PgUp', handler: () => setStatus('Prev folder') });
    commandRegistry.register('view.gotoNextFile', { label: 'Goto Next File', shortcut: 'PgDn', handler: () => setStatus('Next file') });
    commandRegistry.register('view.gotoPrevFile', { label: 'Goto Prev File', shortcut: 'PgUp', handler: () => setStatus('Prev file') });
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
        handler: async () => {
            if (window.electron?.dialog) {
                const dir = await window.electron.dialog.openDirectory();
                if (dir) appStore.setState({ rootPath: dir, currentPath: dir });
            }
        }
    });
    commandRegistry.register('insert.favorites', { label: 'My Favorite Symbols', handler: () => appStore.setState({ activeDialog: 'favoritesManager' }) });
    commandRegistry.register('insert.function', {
        label: 'Function',
        shortcut: 'F4',
        handler: () => appStore.setState({ activeDialog: 'functionInsert' })
    });
    commandRegistry.register('insert.label', { label: 'Label', handler: () => setStatus('Label insert') });

    // === FORMAT ===
    commandRegistry.register('format.axes', { label: 'Axes...', handler: () => setStatus('Axes configuration') });
    commandRegistry.register('format.titles', { label: 'Titles', handler: () => setStatus('Title configuration') });
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
    commandRegistry.register('format.fonts', { label: 'Fonts...', handler: () => setStatus('Font configuration') });
    commandRegistry.register('format.margins', { label: 'Margins...', handler: () => setStatus('Margin configuration') });
    commandRegistry.register('format.background', { label: 'Background', handler: () => setStatus('Background configuration') });
    commandRegistry.register('format.decimals', { label: 'Decimals', handler: () => setStatus('Decimal configuration') });
    commandRegistry.register('format.currencyCode', { label: 'Currency Code', handler: () => setStatus('Currency code toggle') });
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
            // Trigger the expression panel's calculate function
            import('../../components/expression/ExpressionPanel.jsx').then(mod => {
                if (mod.triggerCalculate) mod.triggerCalculate();
            });
        }
    });
    commandRegistry.register('tools.recalculateFolder', { label: 'Recalculate Folder', shortcut: 'Alt+F5', handler: () => setStatus('Recalculate folder') });
    commandRegistry.register('tools.recalculateFile', { label: 'Recalculate File', handler: () => setStatus('Recalculate file') });
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
    commandRegistry.register('data.cacheStats', { label: 'Cache Stats', handler: () => setStatus('Cache stats') });
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
    commandRegistry.register('window.tile', { label: 'Tile', handler: () => setStatus('Tile plots') });
    commandRegistry.register('window.autotile', { label: 'Autotile', handler: () => setStatus('Autotile plots') });
    commandRegistry.register('window.cascade', { label: 'Cascade', handler: () => setStatus('Cascade plots') });
    commandRegistry.register('window.arrangeIcons', { label: 'Arrange Icons', handler: () => setStatus('Arrange icons') });

    // === HELP ===
    commandRegistry.register('help.topics', { label: 'Help Topics', shortcut: 'F1', handler: () => setStatus('Help: PlotTool - Financial time series visualization') });
    commandRegistry.register('help.acceleratorKeys', {
        label: 'Accelerator Keys',
        handler: () => {
            const shortcuts = Object.values(commandRegistry.commands)
                .filter(c => c.shortcut)
                .map(c => `${c.shortcut}: ${c.label}`)
                .join('\n');
            setStatus('Accelerator keys shown in console');
            console.log('=== Accelerator Keys ===\n' + shortcuts);
        }
    });
    commandRegistry.register('help.about', {
        label: 'About PlotTool...',
        handler: () => appStore.setState({ activeDialog: 'about' })
    });
}
