// Keyboard Shortcut Manager
import { commandRegistry } from './registry.js';

const shortcutMap = {
    'ctrl+n': 'file.new',
    'ctrl+o': 'file.open',
    'ctrl+s': 'file.save',
    'ctrl+p': 'file.print',
    'ctrl+z': 'edit.undo',
    'ctrl+x': 'edit.cut',
    'ctrl+c': 'edit.copy',
    'ctrl+v': 'edit.paste',
    'ctrl+shift+c': 'edit.copyGraphics',
    'ctrl+shift+d': 'edit.copyData',
    'ctrl+f': 'edit.find',
    'ctrl+r': 'edit.replace',
    'ctrl+b': 'format.disabled',
    'ctrl+h': 'format.hidden',
    'ctrl+u': 'data.view',
    'ctrl+d': 'data.viewMerged',
    'ctrl+shift+pgdn': 'view.gotoNextFolder',
    'ctrl+shift+pgup': 'view.gotoPrevFolder',
    'alt+a': 'data.vitalStats',
    'alt+c': 'format.color',
    'alt+r': 'view.zoomBackOut',
    'f1': 'help.topics',
    'f4': 'insert.function',
    'alt+f5': 'tools.recalculateFolder',
    'f7': 'tools.slangExamples',
    'f9': 'tools.recalculatePlot',
    'escape': 'view.zoomBackOut',
};

function keyEventToString(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    let key = e.key.toLowerCase();
    // Normalize key names
    if (key === 'pagedown') key = 'pgdn';
    if (key === 'pageup') key = 'pgup';
    if (key === 'escape') key = 'escape';

    // Don't add modifier keys themselves
    if (['control', 'alt', 'shift', 'meta'].includes(key)) return null;

    parts.push(key);
    return parts.join('+');
}

export function handleKeyDown(e) {
    const combo = keyEventToString(e);
    if (!combo) return;

    const commandId = shortcutMap[combo];
    if (commandId) {
        // Don't intercept if user is typing in an input/textarea (except specific shortcuts)
        const tag = document.activeElement?.tagName?.toLowerCase();
        const isEditing = tag === 'input' || tag === 'textarea';

        // Allow these shortcuts even while editing
        const alwaysActive = ['f1', 'f4', 'f5', 'f7', 'f9', 'escape'];
        const isAlwaysActive = alwaysActive.some(k => combo.endsWith(k));

        if (isEditing && !isAlwaysActive) return;

        e.preventDefault();
        e.stopPropagation();
        commandRegistry.execute(commandId);
    }
}

export function getShortcutLabel(commandId) {
    const cmd = commandRegistry.get(commandId);
    return cmd?.shortcut || '';
}

export { shortcutMap };
