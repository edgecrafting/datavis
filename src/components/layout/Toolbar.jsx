import React from 'react';
import {
    FilePlus, FolderOpen, Save, Printer, Eye,
    Copy, ClipboardList,
    ZoomIn, ZoomOut, Maximize2, RotateCcw, ArrowUpDown,
    MousePointer2, Type, Minus, ArrowRight,
    Play, FunctionSquare, DollarSign,
} from 'lucide-react';
import { commandRegistry } from '../../services/commands/registry.js';
import { useAppStore } from '../../store/appStore.js';
import { usePlotStore } from '../../store/plotStore.js';

// eslint-disable-next-line no-unused-vars
const ToolbarButton = ({ Icon, title, commandId, onClick, style, children }) => {
    const handleClick = () => {
        if (commandId) {
            commandRegistry.execute(commandId);
        } else if (onClick) {
            onClick();
        }
    };

    return (
        <button className="toolbar-button" title={title} onClick={handleClick} style={style}>
            {children || <Icon size={16} strokeWidth={1.5} />}
        </button>
    );
};

const Separator = () => <div className="toolbar-separator" />;

export default function Toolbar() {
    const showMainToolbar = useAppStore(s => s.showMainToolbar);
    const showPlotTools = useAppStore(s => s.showPlotTools);

    return (
        <div className="toolbar">
            {showMainToolbar && (
                <div className="toolbar-row">
                    <ToolbarButton Icon={FilePlus} title="New (Ctrl+N)" commandId="file.new" />
                    <ToolbarButton Icon={FolderOpen} title="Open (Ctrl+O)" commandId="file.open" />
                    <ToolbarButton Icon={Save} title="Save (Ctrl+S)" commandId="file.save" />
                    <Separator />
                    <ToolbarButton Icon={Printer} title="Print (Ctrl+P)" commandId="file.print" />
                    <ToolbarButton Icon={Eye} title="Print Preview" commandId="file.printPreview" />
                    <Separator />
                    <ToolbarButton Icon={Copy} title="Copy Graphics (Ctrl+Shift+C)" commandId="edit.copyGraphics" />
                    <ToolbarButton Icon={ClipboardList} title="Copy Data (Ctrl+Shift+D)" commandId="edit.copyData" />
                    <Separator />
                    <ToolbarButton
                        Icon={Play}
                        title="GO (Ctrl+Enter)"
                        style={{ color: '#008000' }}
                        onClick={() => usePlotStore.getState().requestEvaluation()}
                    />
                    <Separator />
                    <ToolbarButton Icon={FunctionSquare} title="Function (F4)" commandId="insert.function" />
                    <ToolbarButton Icon={DollarSign} title="Currency Code" commandId="format.currencyCode" />
                </div>
            )}
            {showPlotTools && (
                <div className="toolbar-row">
                    <ToolbarButton Icon={RotateCcw} title="Zoom Back Out" commandId="view.zoomBackOut" />
                    <ToolbarButton Icon={ZoomIn} title="Zoom In a Bit" commandId="view.zoomInABit" />
                    <ToolbarButton Icon={ZoomOut} title="Zoom Out a Bit" commandId="view.zoomOutABit" />
                    <ToolbarButton Icon={ArrowUpDown} title="Flatten" commandId="view.flatten" />
                    <Separator />
                    <ToolbarButton Icon={MousePointer2} title="Select" onClick={() => {}} />
                    <ToolbarButton Icon={ArrowRight} title="Arrow" onClick={() => {}} />
                    <Separator />
                    <ToolbarButton Icon={Type} title="Text Label" commandId="insert.label" />
                    <ToolbarButton Icon={Minus} title="Line" onClick={() => {}} />
                    <Separator />
                    <ToolbarButton Icon={Maximize2} title="Autoscale" commandId="view.zoomBackOut" />
                </div>
            )}
        </div>
    );
}
