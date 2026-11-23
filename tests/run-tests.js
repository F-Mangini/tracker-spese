import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resetAppState } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const suitesDir = path.join(__dirname, 'suites');
const filters = process.argv.slice(2)
    .map(arg => String(arg || '').trim().toLowerCase())
    .filter(Boolean);

const allSuites = fs.readdirSync(suitesDir)
    .filter(file => file.endsWith('.test.js'))
    .sort();

const selectedSuites = filters.length === 0
    ? allSuites
    : allSuites.filter(file => {
        const lowerFile = file.toLowerCase();
        const baseName = lowerFile.replace(/\.test\.js$/, '');
        return filters.some(filter => lowerFile.includes(filter) || baseName.includes(filter));
    });

if (selectedSuites.length === 0) {
    console.error(`Nessuna suite trovata per i filtri: ${filters.join(', ')}`);
    console.error(`Suite disponibili: ${allSuites.map(file => file.replace(/\.test\.js$/, '')).join(', ')}`);
    process.exitCode = 1;
} else {
    const tests = [];

    function test(name, fn) {
        tests.push({ name, fn });
    }

    for (const file of selectedSuites) {
        const suiteUrl = pathToFileURL(path.join(suitesDir, file)).href;
        const suiteModule = await import(suiteUrl);
        suiteModule.default(test);
    }

    let failed = 0;

    for (const { name, fn } of tests) {
        try {
            resetAppState();
            await fn();
            console.log(`ok - ${name}`);
        } catch (error) {
            failed += 1;
            console.error(`not ok - ${name}`);
            console.error(error);
        }
    }

    if (failed > 0) {
        process.exitCode = 1;
    } else {
        console.log(`\n${tests.length} test superati.`);
    }
}
