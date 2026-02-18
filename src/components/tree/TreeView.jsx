import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import TreeNode from './TreeNode';

export default function TreeView() {
    const { rootPath } = useAppStore();
    const [rootNodes, setRootNodes] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadRoot = async () => {
            try {
                if (!window.electron) {
                    setError("Electron API not available");
                    return;
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

    return (
        <div style={{ padding: '2px' }}>
            {rootNodes.map(node => (
                <TreeNode key={node.path} node={node} level={0} />
            ))}
        </div>
    );
}
