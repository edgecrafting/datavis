import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { loadCsvSeries } from '../../services/csv/loader';
import { useDataStore } from '../../store/dataStore';
import { usePlotStore } from '../../store/plotStore';

function CategoryItem({ item, categoryName }) {
    const { selectedFile, selectFile, removeItemFromCategory } = useAppStore();
    const isSelected = selectedFile?.path === item.path;

    const handleClick = (e) => {
        e.stopPropagation();
        selectFile({ path: item.path, name: item.label, isDirectory: false });
    };

    const handleDoubleClick = async (e) => {
        e.stopPropagation();
        const display = item.label || item.path.split(/[\\/]/).pop().replace(/\.csv$/i, '');
        usePlotStore.getState().insertText(display);
        try {
            const data = await loadCsvSeries(item.path);
            const { addToCache } = useDataStore.getState();
            addToCache(data.name, data);
            addToCache(display, data);
        } catch (err) {
            console.error('Failed to pre-cache:', err);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (confirm(`Remove "${item.label}" from category "${categoryName}"?`)) {
            removeItemFromCategory(categoryName, item.path);
        }
    };

    return (
        <div
            className={`tree-node ${isSelected ? 'selected' : ''}`}
            style={{ paddingLeft: '20px' }}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            title={item.path}
        >
            <div className="tree-toggle" />
            <div className="tree-icon"><FileText size={16} color="#666" /></div>
            <span className="tree-label">{item.label}</span>
        </div>
    );
}

export default function CategoryNode({ category }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const { removeTreeCategory } = useAppStore();

    const handleContextMenu = (e) => {
        e.preventDefault();
        if (confirm(`Remove category "${category.name}" and all its items?`)) {
            removeTreeCategory(category.name);
        }
    };

    return (
        <div>
            <div
                className="tree-node category-node"
                style={{ paddingLeft: '4px', fontWeight: 'bold' }}
                onClick={() => setIsExpanded(v => !v)}
                onContextMenu={handleContextMenu}
                title="Right-click to remove category"
            >
                <div className="tree-toggle">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </div>
                <div className="tree-icon">
                    {isExpanded
                        ? <FolderOpen size={16} color="#a8741a" />
                        : <Folder size={16} color="#a8741a" />}
                </div>
                <span className="tree-label">{category.name}</span>
            </div>
            {isExpanded && (
                <div>
                    {category.items.map((item, i) => (
                        <CategoryItem key={item.path + i} item={item} categoryName={category.name} />
                    ))}
                    {category.items.length === 0 && (
                        <div style={{ paddingLeft: '36px', color: '#888', fontStyle: 'italic', fontSize: '10px' }}>
                            (empty — right-click a file to add)
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
