# DataVisual

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

## Expression Language

DataVisual evaluates one expression per line. Each line produces a series.

### Operators

| Op | Meaning | Example |
|----|---------|---------|
| `+` `-` `*` `/` | Arithmetic (auto-aligned by date) | `SPX + SPY`, `SPX / SPY` |
| `-` | Unary negation | `-SPX` |

### Assignment + display name

```
x = SPX / SPY
ind(x) ; SPX vs SPY (indexed)
```

### Date input formats

`YYYY-MM-DD` · `DD/MM/YYYY` · `dMMMYY` (e.g. `15Jan24`) · `-Ny` `-Nm` `-Nw` `-Nd` (relative) · `ytd` · `mtd` · `today`

### Functions

**Rebasing:** `ind(s)` (to 1.0), `indd(s)` (to 0)

**Smoothing:** `ma(s, period)`, `ema(s, span)`, `shift(s, n)`

**Returns:** `diff(s)`, `pct(s)`, `cumsum(s)`, `yoy(s)`

**Rolling stats:** `rmin/rmax/rstd(s, p)`, `vol(s, p)`, `zscore(s, p)`, `corr(a, b, p)`, `beta(s, bench, p)`, `drawdown(s)`, `percentile(s, p, period)`, `skew(s, p)`, `kurt(s, p)`

**Resampling:** `daily`, `weekly`, `monthly`, `yearly` (keep last value per bucket)

**Math:** `sqrt`, `log`, `abs`

**Conditionals:** `if(cond, a, b)`, `gt/lt/gte/lte/eq(a, b)` (return 0/1 series)

**I/O:** `csv("path")` loads a CSV by path

### Examples

```
# Rebased index with moving average
ind(SPX)
ma(ind(SPX), 50)

# 60-day rolling correlation of returns
corr(pct(SPX), pct(QQQ), 60)

# Conditional: SPX return when VIX < 20, else 0
if(lt(VIX, 20), pct(SPX), 0)

# Annualized realized vol
absret = abs(pct(SPX))
ma(absret, 20) * sqrt(252)
```

### Keyboard shortcuts

`F9` evaluate · `Ctrl+T` right axis · `F5` duplicate line · `F4` insert function · `Ctrl+Shift+F` symbol search · `Ctrl+O` open workspace · `Ctrl+S` save · `Help > Accelerator Keys` for the full list
