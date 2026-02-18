# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plottool is an Electron + React desktop application for visualizing and analyzing Bloomberg financial time series data. It provides a file browser for CSV datasets, interactive Plotly charts, an expression evaluator for derived series, and financial statistics (AR, Vol, Sharpe, MaxDD). The UI uses a Windows 2000 retro aesthetic.

## Commands

```bash
npm run dev              # Vite dev server only (port 5190)
npm run electron         # Concurrent: Vite + Electron (main dev workflow)
npm run build            # Vite production build → dist/
npm run electron:build   # Vite build + electron-builder packaging
npm run lint             # ESLint
```

## Architecture

**Four-layer design:**

1. **Electron Shell** (`electron/main.cjs`, `electron/preload.cjs`) — Window management, IPC handlers for filesystem ops (`fs:list-dir`, `fs:read-file`, `dialog:open-directory`). Context isolation enabled, node integration disabled. Uses CommonJS (`.cjs`) because Electron main process doesn't support ESM with `"type": "module"`.

2. **React Components** (`src/components/`) — Layout shell in `App.jsx`. Key components: `TreeView`/`TreeNode` (recursive file browser), `ChartView` (Plotly multi-series renderer), `ExpressionPanel` (expression input + evaluation). MenuBar, Toolbar, StatusBar are mostly stubs.

3. **Zustand Stores** (`src/store/`) — Two stores:
   - `appStore` — UI state: root path (defaults to `C:\Users\haibi\Python\BBGDB`), selected files, sidebar width, panel toggles
   - `dataStore` — Time series data: `seriesMap` keyed by ticker name, each entry has `{name, path, dates[], values[], stats}`

4. **Services** (`src/services/`) — Pure business logic, no React dependencies:
   - `csv/loader.js` — Parses Bloomberg CSV format (header: `,Ticker`, rows: `Date,Value`) via PapaParse, auto-calculates stats
   - `expression/evaluator.js` — Simple expression parser: ticker lookup, `func(ticker, arg)`, binary ops (`A + B`). Currently index-aligned, not date-aligned
   - `functions/registry.js` + `functions/core.js` — Extensible function registry. Registered: `ind` (rebase to 1), `indd` (rebase to 0), `ma` (moving avg), `diff`, `shift`, `sqrt`, `log`, `abs`
   - `stats/calculator.js` — Annualized return, volatility, Sharpe ratio (rf=0), max drawdown. Uses 252 trading days/year

**Data flow:** TreeNode double-click → `loadCsvSeries()` → IPC read file → PapaParse → `calculateStats()` → `dataStore.addSeries()` → ChartView re-renders. ExpressionPanel follows same pattern through the evaluator.

## Key Conventions

- **ESM project** (`"type": "module"` in package.json) except Electron files which use `.cjs`
- Components: PascalCase. Services/functions: camelCase. CSS classes: kebab-case
- Zustand stores use `useXxxStore` naming with `getState()` for non-React access
- All financial functions use `withStats()` helper to auto-attach recalculated statistics
- Function registry is case-insensitive for lookups
- CSV format assumption: first column empty in header row, second column is ticker name

## Tech Stack

React 19, Vite 7, Electron 40, Zustand 5, Plotly.js (basic dist), PapaParse, Lucide React icons
