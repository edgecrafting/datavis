import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { loadCsvSeries } from '../../services/csv/loader';
import { useDataStore } from '../../store/dataStore';
import { usePlotStore } from '../../store/plotStore';
import { addFavorite } from '../../services/favorites/manager';

const TreeNode = ({ node, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [menu, setMenu] = useState(null);

    const { selectedFile, selectFile } = useAppStore();
    const treeCategories = useAppStore(s => s.treeCategories);

    const handleToggle = async (e) => {
        e.stopPropagation();
        if (node.isDirectory) {
            if (!isExpanded) {
                setIsLoading(true);
                try {
                    const list = await window.electron.fs.listDir(node.path);
                    setChildren(list);
                } catch (error) {
                    console.error("Failed to load directory", error);
                } finally {
                    setIsLoading(false);
                }
            }
            setIsExpanded(!isExpanded);
        }
    };

    const handleClick = (e) => {
        e.stopPropagation();
        selectFile(node);
    };

    const handleDoubleClick = async (e) => {
        e.stopPropagation();
        if (!node.isDirectory) {
            // Insert the ticker name (without .csv) into the expression
            const fileName = node.name;
            const displayName = fileName.toLowerCase().endsWith('.csv') ? fileName.slice(0, -4) : fileName;
            usePlotStore.getState().insertText(displayName);

            // Also pre-cache the data for fast evaluation
            try {
                const data = await loadCsvSeries(node.path);
                const { addToCache } = useDataStore.getState();
                addToCache(data.name, data);
                // Also cache by filename and display name for direct references
                addToCache(fileName, data);
                if (displayName !== fileName) addToCache(displayName, data);
            } catch (err) {
                console.error('Failed to pre-cache:', err);
            }
        } else {
            handleToggle(e);
        }
    };

    const isSelected = selectedFile?.path === node.path;

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
    };

    const closeMenu = () => setMenu(null);

    const insertIntoExpression = () => {
        const display = node.name.toLowerCase().endsWith('.csv') ? node.name.slice(0, -4) : node.name;
        usePlotStore.getState().insertText(display);
    };

    const preCache = async () => {
        try {
            const data = await loadCsvSeries(node.path);
            const { addToCache } = useDataStore.getState();
            addToCache(data.name, data);
            useAppStore.setState({ statusMessage: `Cached: ${data.name}` });
        } catch (err) {
            useAppStore.setState({ statusMessage: `Cache failed: ${err.message}` });
        }
    };

    const copyPath = () => {
        navigator.clipboard.writeText(node.path);
        useAppStore.setState({ statusMessage: 'Path copied' });
    };

    const addToFavs = () => {
        addFavorite({ name: node.name, path: node.path, type: node.isDirectory ? 'folder' : 'file' });
        useAppStore.setState({ statusMessage: `Added to favorites: ${node.name}` });
    };

    const addToCategory = (catName) => {
        const display = node.name.toLowerCase().endsWith('.csv') ? node.name.slice(0, -4) : node.name;
        useAppStore.getState().addItemToCategory(catName, { label: display, path: node.path });
        useAppStore.setState({ statusMessage: `Added to "${catName}"` });
    };

    const setAsRoot = () => {
        useAppStore.getState().setRootPath(node.path);
    };

    const ctxAction = (fn) => () => { fn(); closeMenu(); };

    return (
        <div>
            <div
                className={`tree-node ${isSelected ? 'selected' : ''}`}
                style={{ paddingLeft: `${level * 16 + 4}px` }}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
            >
                {/* Toggle */}
                <div className="tree-toggle" onClick={handleToggle}>
                    {node.isDirectory && (
                        isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                    )}
                </div>

                {/* Icon */}
                <div className="tree-icon">
                    {node.isDirectory ? (
                        isExpanded ?
                            <FolderOpen size={16} color="#d4a800" /> :
                            <Folder size={16} color="#d4a800" />
                    ) : (
                        <FileText size={16} color="#666" />
                    )}
                </div>

                {/* Label — strip .csv extension for cleaner display */}
                <span className="tree-label">
                    {!node.isDirectory && node.name.toLowerCase().endsWith('.csv')
                        ? node.name.slice(0, -4)
                        : node.name}
                </span>
            </div>

            {isExpanded && (
                <div>
                    {children.map(child => (
                        <TreeNode key={child.path} node={child} level={level + 1} />
                    ))}
                    {children.length === 0 && !isLoading && (
                        <div style={{ paddingLeft: `${(level + 1) * 16 + 20}px`, color: '#888', fontStyle: 'italic', fontSize: '10px' }}>
                            (Empty)
                        </div>
                    )}
                </div>
            )}
            {menu && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000 }}
                        onClick={closeMenu}
                        onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
                    />
                    <div
                        className="menu-dropdown"
                        style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 3001, minWidth: '180px' }}
                    >
                        {!node.isDirectory && (
                            <>
                                <div className="menu-item" onClick={ctxAction(insertIntoExpression)}>
                                    <span className="menu-check" />
                                    <span className="menu-label">Insert into Expression</span>
                                </div>
                                <div className="menu-item" onClick={ctxAction(preCache)}>
                                    <span className="menu-check" />
                                    <span className="menu-label">Pre-cache</span>
                                </div>
                                <div className="menu-separator" />
                            </>
                        )}
                        {node.isDirectory && (
                            <>
                                <div className="menu-item" onClick={ctxAction(setAsRoot)}>
                                    <span className="menu-check" />
                                    <span className="menu-label">Set as Root</span>
                                </div>
                                <div className="menu-separator" />
                            </>
                        )}
                        <div className="menu-item" onClick={ctxAction(copyPath)}>
                            <span className="menu-check" />
                            <span className="menu-label">Copy Path</span>
                        </div>
                        <div className="menu-item" onClick={ctxAction(addToFavs)}>
                            <span className="menu-check" />
                            <span className="menu-label">Add to Favorites</span>
                        </div>
                        {!node.isDirectory && treeCategories.length > 0 && (
                            <>
                                <div className="menu-separator" />
                                <div style={{ padding: '2px 8px', fontSize: '10px', color: '#666' }}>Add to Category:</div>
                                {treeCategories.map(cat => (
                                    <div key={cat.name} className="menu-item" onClick={ctxAction(() => addToCategory(cat.name))}>
                                        <span className="menu-check" />
                                        <span className="menu-label">{cat.name}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default TreeNode;
