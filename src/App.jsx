import React, { useEffect } from 'react';
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

// Register commands once at module level
registerAllCommands(useAppStore, useDataStore, usePlotStore);

function App() {
    const showExpressionWindow = useAppStore(s => s.showExpressionWindow);
    const activeDialog = useAppStore(s => s.activeDialog);
    const dataViewerMerged = useAppStore(s => s.dataViewerMerged);

    // Global keyboard shortcuts
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
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
        </div>
    );
}

export default App;
