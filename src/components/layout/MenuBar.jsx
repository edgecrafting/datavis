import React, { useState, useRef, useEffect, useCallback } from 'react';
import { commandRegistry } from '../../services/commands/registry.js';
import { useAppStore } from '../../store/appStore.js';

// Menu structure definition
function getMenuDefinition() {
    const app = useAppStore.getState();
    const recentFiles = app.recentFiles || [];

    return {
        File: [
            { id: 'file.new' },
            { id: 'file.open' },
            { id: 'file.save' },
            { type: 'submenu', label: 'Save Others', items: [
                { id: 'file.saveWorkspace' },
            ]},
            { id: 'file.saveWorkspace' },
            { type: 'separator' },
            { id: 'file.exportGif' },
            { type: 'separator' },
            { id: 'file.print' },
            { id: 'file.printPreview' },
            { id: 'file.printSetup' },
            { type: 'separator' },
            { id: 'file.plotProperties' },
            { type: 'separator' },
            ...(recentFiles.length > 0 ? [
                ...recentFiles.map((f, i) => ({ type: 'custom', label: `${i + 1}. ${f.split(/[\\/]/).pop()}`, handler: () => {} })),
                { type: 'separator' },
            ] : []),
            { id: 'file.exit' },
        ],
        Edit: [
            { id: 'edit.undo' },
            { type: 'separator' },
            { id: 'edit.cut' },
            { id: 'edit.copy' },
            { id: 'edit.copyGraphics' },
            { id: 'edit.copyData' },
            { id: 'edit.paste' },
            { type: 'separator' },
            { id: 'edit.exprProperties' },
            { id: 'edit.sortExpressions' },
            { type: 'separator' },
            { id: 'edit.find' },
            { id: 'edit.replace' },
            { type: 'separator' },
            { id: 'edit.duplicatePlot' },
        ],
        View: [
            { id: 'view.zoomBackOut' },
            { id: 'view.zoomToDataStart' },
            { id: 'view.zoomInABit' },
            { id: 'view.zoomOutABit' },
            { id: 'view.flatten' },
            { type: 'separator' },
            { id: 'view.mergeVisiblePlots' },
            { id: 'view.sameDatesEverywhere' },
            { type: 'separator' },
            { id: 'view.gotoNextFolder' },
            { id: 'view.gotoPrevFolder' },
            { id: 'view.gotoNextFile' },
            { id: 'view.gotoPrevFile' },
            { type: 'separator' },
            { id: 'view.toggleMainToolbar', checkable: true },
            { id: 'view.toggleExpressionTools', checkable: true },
            { id: 'view.togglePlotTools', checkable: true },
            { id: 'view.toggleStudyBar', checkable: true },
            { type: 'separator' },
            { id: 'view.showExpressionWindow', checkable: true },
        ],
        Insert: [
            { id: 'insert.browseSymbol' },
            { id: 'insert.favorites' },
            { type: 'separator' },
            { id: 'insert.function' },
            { id: 'insert.label' },
        ],
        Format: [
            { id: 'format.axes' },
            { id: 'format.titles' },
            { type: 'submenu', label: 'Plot Type', items: [
                { id: 'format.plotType.timeSeries', checkable: true },
                { id: 'format.plotType.histogram', checkable: true },
                { id: 'format.plotType.scatter', checkable: true },
                { id: 'format.plotType.pie', checkable: true },
            ]},
            { id: 'format.fonts' },
            { id: 'format.margins' },
            { id: 'format.background' },
            { type: 'separator' },
            { id: 'format.decimals' },
            { id: 'format.currencyCode' },
            { type: 'separator' },
            { id: 'format.onRight' },
            { id: 'format.disabled' },
            { id: 'format.hidden' },
            { type: 'separator' },
            { id: 'format.color' },
        ],
        Tools: [
            { id: 'tools.study' },
            { id: 'tools.eraseAllLines' },
            { type: 'separator' },
            { type: 'submenu', label: 'Recalculate', items: [
                { id: 'tools.recalculatePlot' },
                { id: 'tools.recalculateFolder' },
                { id: 'tools.recalculateFile' },
            ]},
            { type: 'separator' },
            { id: 'tools.slangExamples' },
            { type: 'separator' },
            { id: 'tools.options' },
        ],
        Data: [
            { id: 'data.view' },
            { id: 'data.viewMerged' },
            { type: 'separator' },
            { id: 'data.vitalStats' },
            { id: 'data.cacheStats' },
            { id: 'data.memoryUsage' },
            { id: 'data.lastError' },
        ],
        Window: [
            { id: 'window.tile' },
            { id: 'window.autotile' },
            { id: 'window.cascade' },
            { id: 'window.arrangeIcons' },
        ],
        Help: [
            { id: 'help.topics' },
            { id: 'help.acceleratorKeys' },
            { type: 'separator' },
            { id: 'help.about' },
        ],
    };
}

const MENU_NAMES = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Data', 'Window', 'Help'];

function MenuItem({ item, onClose }) {
    const [submenuOpen, setSubmenuOpen] = useState(false);
    const itemRef = useRef(null);

    if (item.type === 'separator') {
        return <div className="menu-separator" />;
    }

    if (item.type === 'submenu') {
        return (
            <div
                className="menu-item has-submenu"
                ref={itemRef}
                onMouseEnter={() => setSubmenuOpen(true)}
                onMouseLeave={() => setSubmenuOpen(false)}
            >
                <span className="menu-check" />
                <span className="menu-label">{item.label}</span>
                <span className="menu-shortcut" />
                <span className="menu-arrow">&#9656;</span>
                {submenuOpen && (
                    <div className="menu-dropdown submenu" style={{ left: '100%', top: '-2px' }}>
                        {item.items.map((sub, idx) => (
                            <MenuItem key={idx} item={sub} onClose={onClose} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const cmd = item.id ? commandRegistry.get(item.id) : null;
    if (!cmd && !item.label && !item.type) return null;

    const label = cmd?.label || item.label || '';
    const shortcut = cmd?.shortcut || '';
    const isEnabled = item.id ? commandRegistry.isEnabled(item.id) : true;
    const isChecked = item.checkable && item.id ? commandRegistry.isChecked(item.id) : false;

    const handleClick = (e) => {
        e.stopPropagation();
        if (!isEnabled) return;
        if (item.id) {
            commandRegistry.execute(item.id);
        } else if (item.handler) {
            item.handler();
        }
        onClose();
    };

    return (
        <div
            className={`menu-item ${!isEnabled ? 'disabled' : ''}`}
            onClick={handleClick}
        >
            <span className="menu-check">{isChecked ? '\u2713' : ''}</span>
            <span className="menu-label">{label}</span>
            <span className="menu-shortcut">{shortcut}</span>
        </div>
    );
}

export default function MenuBar() {
    const [openMenu, setOpenMenu] = useState(null);
    const [menuHover, setMenuHover] = useState(false);
    const barRef = useRef(null);

    const handleMenuClick = useCallback((name) => {
        setOpenMenu(prev => prev === name ? null : name);
    }, []);

    const handleMenuEnter = useCallback((name) => {
        if (openMenu) setOpenMenu(name);
    }, [openMenu]);

    const closeMenu = useCallback(() => {
        setOpenMenu(null);
    }, []);

    // Close menu on click outside
    useEffect(() => {
        if (!openMenu) return;
        const handler = (e) => {
            if (barRef.current && !barRef.current.contains(e.target)) {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openMenu, closeMenu]);

    // Close on Escape
    useEffect(() => {
        if (!openMenu) return;
        const handler = (e) => {
            if (e.key === 'Escape') closeMenu();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [openMenu, closeMenu]);

    const menuDef = getMenuDefinition();

    return (
        <div className="menu-bar" ref={barRef}>
            {MENU_NAMES.map(name => (
                <div
                    key={name}
                    className={`menu-bar-item ${openMenu === name ? 'active' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); handleMenuClick(name); }}
                    onMouseEnter={() => handleMenuEnter(name)}
                >
                    {name}
                    {openMenu === name && menuDef[name] && (
                        <div className="menu-dropdown">
                            {menuDef[name].map((item, idx) => (
                                <MenuItem key={idx} item={item} onClose={closeMenu} />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
