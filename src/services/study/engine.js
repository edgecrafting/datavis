// Study engine - saved expression templates (macros) that can be applied to series

const STORAGE_KEY = 'plottoolStudies';

const DEFAULT_STUDIES = [
    { name: 'Index to 1', template: 'ind($1)', description: 'Rebase series to start at 1.0' },
    { name: 'Index to 0', template: 'indd($1)', description: 'Rebase series to start at 0.0' },
    { name: 'MA 20', template: 'ma($1, 20)', description: '20-day moving average' },
    { name: 'MA 50', template: 'ma($1, 50)', description: '50-day moving average' },
    { name: 'MA 200', template: 'ma($1, 200)', description: '200-day moving average' },
    { name: 'Daily Change', template: 'diff($1)', description: 'First difference (daily change)' },
    { name: 'Vol (annualized)', template: 'ma(abs(diff($1) / shift($1, 1)), 20) * sqrt(252)', description: 'Rolling 20-day annualized vol' },
    { name: 'Spread', template: '$1 - $2', description: 'Difference between two series' },
    { name: 'Ratio', template: '$1 / $2', description: 'Ratio of two series' },
    { name: 'Log', template: 'log($1)', description: 'Natural logarithm' },
    { name: 'Lag 1', template: 'shift($1, 1)', description: 'Shift series by 1 day' },
];

function loadStudies() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [...DEFAULT_STUDIES];
}

function saveStudies(studies) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(studies));
}

export function getStudies() {
    return loadStudies();
}

export function addStudy(study) {
    const studies = loadStudies();
    studies.push(study);
    saveStudies(studies);
    return studies;
}

export function removeStudy(name) {
    const studies = loadStudies().filter(s => s.name !== name);
    saveStudies(studies);
    return studies;
}

export function applyStudyTemplate(template, seriesNames) {
    let result = template;
    seriesNames.forEach((name, i) => {
        result = result.replaceAll(`$${i + 1}`, name);
    });
    return result;
}

export { DEFAULT_STUDIES };
