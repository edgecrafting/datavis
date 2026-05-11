import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import TreeNode from './TreeNode';
import CategoryNode from './CategoryNode';

export default function TreeView() {
    const rootPath = useAppStore(s => s.rootPath);
    const treeCategories = useAppStore(s => s.treeCategories);
    const addTreeCategory = useAppStore(s => s.addTreeCategory);
    const [rootNodes, setRootNodes] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadRoot = async () => {
            try {
                if (!window.electron) {
                    setError("Electron API not available");
                    return;
                }
                // Grant access to this directory before reading it (security boundary).
                if (window.electron.fs.setRoot) {
                    await window.electron.fs.setRoot(rootPath);
                }
                const list = await window.electron.fs.listDir(rootPath);
                setRootNodes(list);
                setError(null);
            } catch (err) {
                console.error("Failed to load root", err);
                setError(err.message);
            }
        };

        loadRoot();
    }, [rootPath]);

    if (error) {
        return <div style={{ padding: '8px', color: 'red', fontSize: '11px' }}>Error: {error}</div>;
    }

    const handleNewCategory = () => {
        const name = prompt('Category name:');
        if (name && name.trim()) addTreeCategory(name.trim());
    };

    return (
        <div style={{ padding: '2px' }}>
            {treeCategories.length > 0 && (
                <div className="tree-section">
                    {treeCategories.map(cat => (
                        <CategoryNode key={cat.name} category={cat} />
                    ))}
                </div>
            )}
            <div
                className="tree-section-add"
                onClick={handleNewCategory}
                title="Add a new category"
                style={{ padding: '2px 4px', fontSize: '10px', color: '#666', cursor: 'pointer', borderBottom: '1px solid #ddd' }}
            >
                + New Category
            </div>
            {rootNodes.map(node => (
                <TreeNode key={node.path} node={node} level={0} />
            ))}
        </div>
    );
}
