import Papa from 'papaparse';
import { calculateStats } from '../stats/calculator';
import { normalizeDate, parseDate } from '../dates/normalize.js';

export const loadCsvSeries = async (filePath) => {
    try {
        const content = await window.electron.fs.readFile(filePath);
        return new Promise((resolve, reject) => {
            Papa.parse(content, {
                header: false, // File has header but format is "empty, Ticker" then data
                skipEmptyLines: true,
                complete: (results) => {
                    // Parse Bloomberg format:
                    // Line 1: ,Ticker Name
                    // Line 2+: Date, Value

                    if (results.data.length < 2) {
                        reject(new Error("File is empty or invalid"));
                        return;
                    }

                    const headerRow = results.data[0];
                    const ticker = headerRow[1] || "Unknown"; // cell 1 is ticker

                    const dates = [];
                    const values = [];

                    for (let i = 1; i < results.data.length; i++) {
                        const row = results.data[i];
                        if (row.length >= 2) {
                            const rawDate = row[0];
                            const rawVal = row[1];
                            // Validate date: must parse to a real date
                            if (!rawDate || !parseDate(rawDate)) continue;
                            // Validate value: must be a finite number
                            const val = parseFloat(rawVal);
                            if (isNaN(val)) continue;

                            dates.push(normalizeDate(rawDate));
                            values.push(val);
                        }
                    }

                    // Detect reverse-chronological order and fix
                    if (dates.length >= 2 && dates[0] > dates[dates.length - 1]) {
                        dates.reverse();
                        values.reverse();
                    }

                    resolve({
                        name: ticker,
                        path: filePath,
                        dates,
                        values,
                        stats: calculateStats(dates, values)
                    });
                },
                error: (err) => reject(err)
            });
        });
    } catch (err) {
        console.error("Failed to load CSV:", err);
        throw err;
    }
};
