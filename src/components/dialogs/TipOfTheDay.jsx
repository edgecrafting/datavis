import React, { useState } from 'react';
import DialogBase from './DialogBase.jsx';

const TIPS = [
    "Type `ind(SPX)` to rebase a series to 1.0 from your Start date.",
    "Press **F9** anywhere to recalculate the active plot.",
    "Use **Ctrl+T** to toggle the right axis for the current line.",
    "Type a few letters and an **autocomplete popup** suggests function and ticker names.",
    "Use the **1M / 3M / 6M / YTD / 1Y / 5Y / MAX** chips to quickly change the date window.",
    "Stats refresh based on the chosen date window — change Start/End and press GO.",
    "Right-click any series row in the stats table for color, axis, and visibility options.",
    "Right-click a tree file to insert it, pre-cache it, copy its path, or add it to a category.",
    "Press **Ctrl+Shift+F** to fuzzy-search across all CSVs in your data root.",
    "Use `csv(\"path/to/file.csv\")` to load a CSV by full path inside an expression.",
    "Combine series with `+ - * /` — they're auto-aligned by date.",
    "Use `ma(SPX, 20)` for moving average, `pct(SPX)` for daily returns, `vol(SPX, 60)` for rolling vol.",
    "**Save Workspace** (Ctrl+S) saves all plots, expressions, and configs to a `.ptw` file.",
    "Format > Axes... lets you set log scale and custom Y ranges.",
    "Insert > Label adds a chart annotation at your last hover position.",
    "Hover the chart for a **unified tooltip** showing all series values at that date.",
    "Use `a = expression` syntax to define intermediate names you can reference in later lines.",
    "Append `; My Title` to a line to override the series' display name.",
    "**Tools > Slang Examples** has ready-made expression templates.",
    "Drag the divider between the tree and chart to resize the sidebar.",
];

function pickTip() {
    let idx;
    try {
        const last = parseInt(localStorage.getItem('lastTipIndex') || '-1', 10);
        idx = (Number.isFinite(last) ? last + 1 : 0) % TIPS.length;
        localStorage.setItem('lastTipIndex', String(idx));
    } catch {
        idx = Math.floor(Math.random() * TIPS.length);
    }
    return idx;
}

function renderTip(text) {
    // Replace **bold** segments with <strong>
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
            return <strong key={i}>{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith('`') && p.endsWith('`')) {
            return <code key={i} style={{ background: '#f5f5dc', padding: '0 3px', fontFamily: 'Consolas, monospace' }}>{p.slice(1, -1)}</code>;
        }
        return p;
    });
}

export default function TipOfTheDay({ onClose }) {
    const [idx, setIdx] = useState(() => pickTip());
    const [dontShow, setDontShow] = useState(() => {
        try { return localStorage.getItem('hideTipOfDay') === 'true'; }
        catch { return false; }
    });

    const handleClose = () => {
        try { localStorage.setItem('hideTipOfDay', dontShow ? 'true' : 'false'); }
        catch { /* ignore */ }
        onClose();
    };

    const next = () => {
        const n = (idx + 1) % TIPS.length;
        setIdx(n);
        try { localStorage.setItem('lastTipIndex', String(n)); } catch { /* ignore */ }
    };

    return (
        <DialogBase title="Tip of the Day" onClose={handleClose} width={460} footer={
            <div className="dialog-footer" style={{ justifyContent: 'space-between' }}>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                        type="checkbox"
                        checked={dontShow}
                        onChange={(e) => setDontShow(e.target.checked)}
                    />
                    Don't show at startup
                </label>
                <div>
                    <button className="win-button" onClick={next}>Next Tip</button>
                    <button className="win-button" onClick={handleClose}>Close</button>
                </div>
            </div>
        }>
            <div style={{ padding: '12px', fontSize: '12px', lineHeight: 1.5, minHeight: '80px' }}>
                <div style={{ fontSize: '32px', float: 'left', marginRight: '12px', color: '#ffc000' }}>💡</div>
                <div>{renderTip(TIPS[idx])}</div>
            </div>
        </DialogBase>
    );
}
