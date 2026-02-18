import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { loadCsvSeries } from '../../services/csv/loader';
import { useDataStore } from '../../store/dataStore';
import { usePlotStore } from '../../store/plotStore';

const TreeNode = ({ node, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const { selectedFile, selectFile } = useAppStore();
    const { addSeries } = useDataStore();

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
            // Insert the file name into the expression via store action
            const fileName = node.name;
            usePlotStore.getState().insertText(fileName);

            // Also pre-cache the data for fast evaluation
            try {
                const data = await loadCsvSeries(node.path);
                const { addToCache } = useDataStore.getState();
                addToCache(data.name, data);
                // Also cache by filename for direct filename references
                addToCache(fileName, data);
            } catch (err) {
                console.error('Failed to pre-cache:', err);
            }
        } else {
            handleToggle(e);
        }
    };

    const isSelected = selectedFile?.path === node.path;

    return (
        <div>
            <div
                className={`tree-node ${isSelected ? 'selected' : ''}`}
                style={{ paddingLeft: `${level * 16 + 4}px` }}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
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

                {/* Label */}
                <span className="tree-label">{node.name}</span>
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
        </div>
    );
};

export default TreeNode;
