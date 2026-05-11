import React, { useEffect, useRef, useCallback } from 'react';
import MenuBar from './components/layout/MenuBar';
import Toolbar from './components/layout/Toolbar';
import StatusBar from './components/layout/StatusBar';
import PlotTabs from './components/layout/PlotTabs';
import TreeView from './components/tree/TreeView';
import ChartView from './components/chart/ChartView';
import StatsTable from './components/chart/StatsTable';
import ExpressionPanel from './components/expression/ExpressionPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { handleKeyDown } from './services/commands/shortcuts';
import { registerAllCommands } from './services/commands/registry';
import { useAppStore } from './store/appStore';
import { useDataStore } from './store/dataStore';
import { usePlotStore } from './store/plotStore';

// Dialogs
import ColorPicker from './components/dialogs/ColorPicker';
import DataViewer from './components/dialogs/DataViewer';
import VitalStats from './components/dialogs/VitalStats';
import FindReplace from './components/dialogs/FindReplace';
import FunctionInsert from './components/dialogs/FunctionInsert';
import FavoritesManager from './components/dialogs/FavoritesManager';
import StudyPanel from './components/panels/StudyPanel';
import OptionsDialog from './components/dialogs/OptionsDialog';
import AboutDialog from './components/dialogs/AboutDialog';
import AxesDialog from './components/dialogs/AxesDialog';
import TitlesDialog from './components/dialogs/TitlesDialog';
import BrowseSymbolSearch from './components/dialogs/BrowseSymbolSearch';
import AcceleratorKeys from './components/dialogs/AcceleratorKeys';
import PlotStyleDialog from './components/dialogs/PlotStyleDialog';
import TipOfTheDay from './components/dialogs/TipOfTheDay';
import SeriesProperties from './components/dialogs/SeriesProperties';
import PlotProperties from './components/dialogs/PlotProperties';
import PopularSymbols from './components/dialogs/PopularSymbols';

// Register commands once at module level
registerAllCommands(useAppStore, useDataStore, usePlotStore);

function App() {
    const showExpressionWindow = useAppStore(s => s.showExpressionWindow);
    const activeDialog = useAppStore(s => s.activeDialog);
    const dataViewerMerged = useAppStore(s => s.dataViewerMerged);
    const activePlotName = usePlotStore(s => s.plots[s.activePlotId]?.name);

    // Global keyboard shortcuts
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sync OS window title to the active plot — matches target "DataVis - <plotName>"
    useEffect(() => {
        const title = activePlotName ? `DataVis - ${activePlotName}` : 'DataVis';
        document.title = title;
        if (window.electron?.window?.setTitle) {
            window.electron.window.setTitle(title);
        }
    }, [activePlotName]);

    // Show Tip of the Day on startup unless suppressed
    useEffect(() => {
        try {
            if (localStorage.getItem('hideTipOfDay') !== 'true') {
                // Defer so the main UI renders first
                setTimeout(() => useAppStore.setState({ activeDialog: 'tipOfDay' }), 400);
            }
        } catch { /* ignore */ }
    }, []);

    // Apply persisted sidebar width as a CSS variable
    const sidebarWidth = useAppStore(s => s.sidebarWidth);
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }, [sidebarWidth]);

    // Splitter drag — drag the divider to resize the tree panel
    const splitterRef = useRef(null);
    const dragStateRef = useRef(null);
    const handleSplitterMouseDown = useCallback((e) => {
        e.preventDefault();
        dragStateRef.current = { startX: e.clientX, startWidth: useAppStore.getState().sidebarWidth };
        const onMove = (ev) => {
            if (!dragStateRef.current) return;
            const delta = ev.clientX - dragStateRef.current.startX;
            const next = Math.max(150, Math.min(600, dragStateRef.current.startWidth + delta));
            useAppStore.setState({ sidebarWidth: next });
        };
        const onUp = () => {
            dragStateRef.current = null;
            try { localStorage.setItem('sidebarWidth', String(useAppStore.getState().sidebarWidth)); } catch { /* ignore */ }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    const closeDialog = () => useAppStore.setState({ activeDialog: null });

    return (
        <div className="app-shell">
            <MenuBar />
            <Toolbar />
            <PlotTabs />
            <div className="main-content">
                <div className="tree-panel">
                    <TreeView />
                </div>
                <div
                    ref={splitterRef}
                    className="tree-splitter"
                    onMouseDown={handleSplitterMouseDown}
                    title="Drag to resize"
                />
                <div className="right-panel">
                    <div className="chart-area">
                        <ErrorBoundary>
                            <ChartView />
                        </ErrorBoundary>
                    </div>
                    <StatsTable />
                    {showExpressionWindow && <ExpressionPanel />}
                </div>
            </div>
            <StatusBar />

            {/* Dialogs */}
            {activeDialog === 'colorPicker' && (
                <ColorPicker
                    onSelect={(color) => {
                        const plotStore = usePlotStore.getState();
                        const keys = Object.keys(useDataStore.getState().seriesMap);
                        if (keys.length > 0) {
                            plotStore.setSeriesConfig(keys[0], { color });
                        }
                    }}
                    onClose={closeDialog}
                />
            )}
            {activeDialog === 'dataViewer' && (
                <DataViewer merged={dataViewerMerged} onClose={closeDialog} />
            )}
            {activeDialog === 'vitalStats' && <VitalStats onClose={closeDialog} />}
            {activeDialog === 'findReplace' && <FindReplace onClose={closeDialog} />}
            {activeDialog === 'functionInsert' && <FunctionInsert onClose={closeDialog} />}
            {activeDialog === 'favoritesManager' && <FavoritesManager onClose={closeDialog} />}
            {activeDialog === 'studyPanel' && <StudyPanel onClose={closeDialog} />}
            {activeDialog === 'options' && <OptionsDialog onClose={closeDialog} />}
            {activeDialog === 'about' && <AboutDialog onClose={closeDialog} />}
            {activeDialog === 'axes' && <AxesDialog onClose={closeDialog} />}
            {activeDialog === 'titles' && <TitlesDialog onClose={closeDialog} />}
            {activeDialog === 'browseSymbol' && <BrowseSymbolSearch onClose={closeDialog} />}
            {activeDialog === 'acceleratorKeys' && <AcceleratorKeys onClose={closeDialog} />}
            {activeDialog === 'plotStyle' && <PlotStyleDialog onClose={closeDialog} initialTab={useAppStore.getState().plotStyleInitialTab || 'fonts'} />}
            {activeDialog === 'tipOfDay' && <TipOfTheDay onClose={closeDialog} />}
            {activeDialog === 'seriesProperties' && (
                <SeriesProperties
                    seriesKey={useAppStore.getState().seriesPropertiesKey}
                    onClose={closeDialog}
                />
            )}
            {activeDialog === 'plotProperties' && <PlotProperties onClose={closeDialog} />}
            {activeDialog === 'popularSymbols' && <PopularSymbols onClose={closeDialog} />}
        </div>
    );
}

export default App;
