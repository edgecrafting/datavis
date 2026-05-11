// Workspace serialization and deserialization with migration support
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';

const CURRENT_VERSION = 3;

export function serializeWorkspace(plotStore, appStore) {
    const plotState = plotStore;
    const appState = appStore;

    return {
        version: CURRENT_VERSION,
        rootPath: appState.rootPath,
        activePlotId: plotState.activePlotId,
        plotOrder: plotState.plotOrder,
        plots: Object.fromEntries(
            plotState.plotOrder.map(id => {
                const plot = plotState.plots[id];
                return [id, {
                    id: plot.id,
                    name: plot.name,
                    expressions: plot.expressions,
                    startDate: plot.startDate,
                    endDate: plot.endDate,
                    plotType: plot.plotType,
                    seriesConfig: plot.seriesConfig,
                    // V3 additions — preserve user customizations across Save/Open
                    axisConfig: plot.axisConfig || {},
                    titles: plot.titles || {},
                    styleConfig: plot.styleConfig || {},
                    annotations: plot.annotations || [],
                    seriesOrder: plot.seriesOrder || [],
                }];
            })
        ),
    };
}

// Migration chain
function migrateV1toV2(data) {
    // V2 adds plotType per-plot (V1 may not have it)
    for (const id of Object.keys(data.plots || {})) {
        if (!data.plots[id].plotType) {
            data.plots[id].plotType = 'timeseries';
        }
    }
    data.version = 2;
    return data;
}

function migrateV2toV3(data) {
    // V3 adds axisConfig, titles, styleConfig, annotations, seriesOrder per-plot
    for (const id of Object.keys(data.plots || {})) {
        const p = data.plots[id];
        if (!p.axisConfig) p.axisConfig = {};
        if (!p.titles) p.titles = {};
        if (!p.styleConfig) p.styleConfig = {};
        if (!p.annotations) p.annotations = [];
        if (!p.seriesOrder) p.seriesOrder = [];
    }
    data.version = 3;
    return data;
}

const migrations = {
    1: migrateV1toV2,
    2: migrateV2toV3,
};

export function deserializeWorkspace(data) {
    if (!data || !data.version) {
        throw new Error('Invalid workspace file format');
    }
    if (data.version > CURRENT_VERSION) {
        throw new Error(`Workspace version ${data.version} is newer than supported (${CURRENT_VERSION}). Update DataVis.`);
    }

    // Apply migrations in sequence
    let current = data;
    while (current.version < CURRENT_VERSION) {
        const migrate = migrations[current.version];
        if (!migrate) {
            throw new Error(`No migration path from version ${current.version}`);
        }
        current = migrate(current);
    }

    return {
        rootPath: current.rootPath,
        activePlotId: current.activePlotId,
        plotOrder: current.plotOrder,
        plots: current.plots,
    };
}

/**
 * Load a workspace from disk and apply it atomically to the stores.
 * Returns true on success, throws on parse/migration failure.
 */
export async function loadWorkspaceFromPath(filePath) {
    if (!window.electron?.fs?.readFile) {
        throw new Error('File reading not available');
    }
    const content = await window.electron.fs.readFile(filePath);
    const data = JSON.parse(content);
    const workspace = deserializeWorkspace(data);

    // Apply atomically to plot store
    usePlotStore.setState({
        plots: workspace.plots,
        plotOrder: workspace.plotOrder,
        activePlotId: workspace.activePlotId,
    });

    // Update app state — keep rootPath if the workspace has one, track path
    const appPatch = { currentWorkspacePath: filePath };
    if (workspace.rootPath) {
        appPatch.rootPath = workspace.rootPath;
        appPatch.currentPath = workspace.rootPath;
        try { localStorage.setItem('lastRootPath', workspace.rootPath); } catch { /* ignore */ }
    }
    useAppStore.setState(appPatch);

    // Track in recent files (most recent first, dedup, cap at 6)
    const recent = [filePath, ...(useAppStore.getState().recentFiles || []).filter(p => p !== filePath)].slice(0, 6);
    useAppStore.setState({ recentFiles: recent });
    try { localStorage.setItem('recentFiles', JSON.stringify(recent)); } catch { /* ignore */ }

    return true;
}
