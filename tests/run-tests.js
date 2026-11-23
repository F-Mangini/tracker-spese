const fs = require('fs');
const path = require('path');

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
        require(path.join(suitesDir, file))(test);
    }

    let failed = 0;

    (async () => {
        for (const { name, fn } of tests) {
            try {
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
    })();
}
