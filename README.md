# DataVis

Electron + React desktop application for visualizing and analyzing Bloomberg financial time series data.

## Features

- File browser for CSV datasets with auto-loading
- Interactive Plotly charts with multi-series support
- Expression evaluator for derived series (e.g., `ind(SPX)`, `ma(SPX, 50)`, `A - B`)
- Financial statistics: Annualized Return, Volatility, Sharpe, Max Drawdown
- 20+ built-in functions: `ind`, `indd`, `ma`, `ema`, `diff`, `shift`, `pct`, `vol`, `zscore`, `corr`, `beta`, `drawdown`, `yoy`, and more
- Windows 2000 retro aesthetic
- Workspace save/load (.ptw files)
- Colorblind-friendly palette option (Okabe-Ito)

## Quick Start

```bash
npm install
npm run electron    # Launch with Electron + Vite dev server
```

## Scripts

```bash
npm run dev              # Vite dev server only (port 5190)
npm run electron         # Concurrent: Vite + Electron (main dev workflow)
npm run build            # Vite production build
npm run electron:build   # Vite build + electron-builder packaging
npm run test             # Run tests (vitest)
npm run lint             # ESLint
npm run format           # Prettier formatting
```

## Tech Stack

React 19, Vite 7, Electron 40, Zustand 5, Plotly.js, PapaParse, Vitest

## Architecture

1. **Electron Shell** (`electron/`) - Window management, IPC handlers for filesystem ops
2. **React Components** (`src/components/`) - TreeView, ChartView, ExpressionPanel, dialogs
3. **Zustand Stores** (`src/store/`) - appStore (UI state), dataStore (series data), plotStore (per-plot state)
4. **Services** (`src/services/`) - CSV loading, expression evaluation, statistics, function registry
