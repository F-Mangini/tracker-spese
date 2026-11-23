import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    collectPrecacheUrls,
    detectSchemaVersion,
    renderReleaseServiceWorker,
    injectReleaseServiceWorkerRegistration
} from './lib/pwa-assets.js';
import { syncPrecache } from './sync-precache.js';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE_ID_PATTERN = /^v\d{4}\.\d{2}\.\d{2}(?:[.-][a-z0-9]+)*$/i;

function isValidIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    );
}

function deriveDateFromReleaseId(releaseId) {
    const match = String(releaseId || '').match(/^v(\d{4})\.(\d{2})\.(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function copyDirFiltered(sourceDir, targetDir) {
    fs.mkdirSync(targetDir, { recursive: true });
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const srcPath = path.join(sourceDir, entry.name);
        const dstPath = path.join(targetDir, entry.name);
        if (entry.isDirectory()) {
            copyDirFiltered(srcPath, dstPath);
        } else {
            fs.copyFileSync(srcPath, dstPath);
        }
    }
}

export function parseCutReleaseArgs(argv = []) {
    const args = {
        releaseId: '',
        notes: '',
        date: '',
        status: 'recommended',
        schemaVersion: undefined,
        dryRun: false,
        syncStableSw: false,
        bumpStableCache: false,
        help: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--help' || arg === '-h') {
            args.help = true;
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg === '--sync-stable-sw') {
            args.syncStableSw = true;
        } else if (arg === '--bump-stable-cache') {
            args.bumpStableCache = true;
        } else if (arg === '--id') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --id');
            args.releaseId = argv[i];
        } else if (arg === '--notes') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --notes');
            args.notes = argv[i];
        } else if (arg === '--date') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --date');
            args.date = argv[i];
        } else if (arg === '--status') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --status');
            args.status = argv[i];
        } else if (arg === '--schema-version') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --schema-version');
            args.schemaVersion = Number(argv[i]);
        } else if (!arg.startsWith('-') && !args.releaseId) {
            args.releaseId = arg;
        } else {
            throw new Error(`Opzione o argomento non valido: ${arg}`);
        }
    }

    return args;
}

export function cutRelease(options = {}) {
    const repoRoot = path.resolve(options.repoRoot || DEFAULT_ROOT);
    const releaseId = String(options.releaseId || '').trim();
    const notes = String(options.notes || '').trim();
    const status = String(options.status || 'recommended').trim();
    const dryRun = !!options.dryRun;
    const syncStableSw = !!options.syncStableSw;
    const bumpStableCache = !!options.bumpStableCache;

    if (!RELEASE_ID_PATTERN.test(releaseId)) {
        throw new Error(`releaseId non valido "${releaseId}": atteso formato vYYYY.MM.DD (es. v2026.06.03)`);
    }
    if (!notes) {
        throw new Error('Parametro --notes obbligatorio e non vuoto');
    }
    if (status !== 'recommended' && status !== 'stable') {
        throw new Error(`Status non valido "${status}": usare "recommended" o "stable"`);
    }

    const date = String(options.date || deriveDateFromReleaseId(releaseId)).trim();
    if (!isValidIsoDate(date)) {
        throw new Error(`Data release non valida "${date}": atteso formato YYYY-MM-DD`);
    }

    const schemaVersion = options.schemaVersion === undefined || options.schemaVersion === null
        ? detectSchemaVersion(repoRoot)
        : Number(options.schemaVersion);
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
        throw new Error(`schemaVersion non valido: ${schemaVersion}`);
    }

    const appDir = path.join(repoRoot, 'app');
    const releaseDir = path.join(repoRoot, 'releases', releaseId);
    const manifestPath = path.join(repoRoot, 'releases.json');

    if (!fs.existsSync(appDir)) {
        throw new Error(`Cartella app non trovata in ${repoRoot}`);
    }
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest releases.json non trovato in ${repoRoot}`);
    }
    if (fs.existsSync(releaseDir)) {
        throw new Error(`La release ${releaseId} esiste gia in releases/${releaseId}/`);
    }

    const rawManifest = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawManifest);
    const existingReleases = Array.isArray(manifest.releases) ? manifest.releases : [];
    if (existingReleases.some(item => item && item.id === releaseId)) {
        throw new Error(`La release ${releaseId} e gia presente in releases.json`);
    }

    const entry = {
        id: releaseId,
        path: `releases/${releaseId}/`,
        date,
        status,
        notes,
        schemaVersion
    };

    const updatedReleases = existingReleases.map(item => (
        status === 'recommended' && item && item.status === 'recommended'
            ? { ...item, status: 'stable' }
            : { ...item }
    ));

    const updatedManifest = {
        recommended: status === 'recommended' ? releaseId : (manifest.recommended || releaseId),
        releases: [entry, ...updatedReleases]
    };

    if (dryRun) {
        const precacheUrls = collectPrecacheUrls(appDir, {
            serviceWorkerFile: 'service-worker.js',
            verifyServiceWorkerExists: false
        });

        return {
            dryRun: true,
            releaseId,
            releaseDir,
            entry,
            precacheCount: precacheUrls.length,
            precacheUrls,
            updatedManifest,
            stableSync: null
        };
    }

    try {
        fs.mkdirSync(releaseDir, { recursive: true });

        const rawIndexHtml = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
        const releaseIndexHtml = injectReleaseServiceWorkerRegistration(rawIndexHtml);
        fs.writeFileSync(path.join(releaseDir, 'index.html'), releaseIndexHtml, 'utf8');
        fs.copyFileSync(path.join(appDir, 'manifest.json'), path.join(releaseDir, 'manifest.json'));

        copyDirFiltered(path.join(appDir, 'css'), path.join(releaseDir, 'css'));
        copyDirFiltered(path.join(appDir, 'js'), path.join(releaseDir, 'js'));
        copyDirFiltered(path.join(appDir, 'vendor'), path.join(releaseDir, 'vendor'));
        copyDirFiltered(
            path.join(appDir, 'icons', 'stable'),
            path.join(releaseDir, 'icons', 'stable')
        );

        const precacheUrls = collectPrecacheUrls(releaseDir, {
            serviceWorkerFile: 'service-worker.js',
            verifyServiceWorkerExists: false
        });
        const swContent = renderReleaseServiceWorker({
            releaseId,
            cacheVersion: 1,
            precacheUrls,
            eol: rawIndexHtml.includes('\r\n') ? '\r\n' : '\n'
        });
        fs.writeFileSync(path.join(releaseDir, 'service-worker.js'), swContent, 'utf8');

        // Verifica finale completa sullo snapshot appena scritto
        const verifiedUrls = collectPrecacheUrls(releaseDir, {
            serviceWorkerFile: 'service-worker.js',
            verifyServiceWorkerExists: true
        });

        const manifestEol = rawManifest.includes('\r\n') ? '\r\n' : '\n';
        const formattedManifest = JSON.stringify(updatedManifest, null, 4).replace(/\n/g, manifestEol) + manifestEol;
        fs.writeFileSync(manifestPath, formattedManifest, 'utf8');

        let stableSync = null;
        if (syncStableSw || bumpStableCache) {
            stableSync = syncPrecache({
                repoRoot,
                bumpCache: bumpStableCache
            });
        }

        return {
            dryRun: false,
            releaseId,
            releaseDir,
            entry,
            precacheCount: verifiedUrls.length,
            precacheUrls: verifiedUrls,
            updatedManifest,
            stableSync
        };
    } catch (error) {
        if (fs.existsSync(releaseDir)) {
            fs.rmSync(releaseDir, { recursive: true, force: true });
        }
        throw error;
    }
}

function printUsage() {
    console.log([
        'Uso: node scripts/cut-release.js <releaseId> --notes "..." [opzioni]',
        '',
        'Opzioni:',
        '  --id <releaseId>       Identificativo release (es. v2026.07.01)',
        '  --notes <testo>        Note release per releases.json (obbligatorio)',
        '  --date <YYYY-MM-DD>    Data release (default: ricavata da releaseId)',
        '  --status <stato>       recommended (default) oppure stable',
        '  --schema-version <n>   Versione schema dati (default: rilevata da storage.js)',
        '  --sync-stable-sw       Riallinea anche app/stable-launch-service-worker.js',
        '  --bump-stable-cache    Riallinea app/stable-launch-service-worker.js e incrementa STATIC_CACHE',
        '  --dry-run              Simula il taglio senza scrivere file o cartelle',
        '  -h, --help             Mostra questo aiuto'
    ].join('\n'));
}

function main() {
    try {
        const args = parseCutReleaseArgs(process.argv.slice(2));
        if (args.help) {
            printUsage();
            return;
        }

        const result = cutRelease(args);
        if (result.dryRun) {
            console.log(`[dry-run] Release ${result.releaseId} (${result.entry.status}, ${result.entry.date})`);
            console.log(`[dry-run] Asset precache calcolati: ${result.precacheCount}`);
            console.log(`[dry-run] Recommended in releases.json: ${result.updatedManifest.recommended}`);
            return;
        }

        console.log(`Creata release ${result.releaseId} in releases/${result.releaseId}/ (${result.precacheCount} asset precacheati).`);
        console.log(`Aggiornato releases.json (recommended: ${result.updatedManifest.recommended}).`);
        if (result.stableSync && result.stableSync.cacheBump) {
            console.log(`Launcher stable aggiornato: static-v${result.stableSync.cacheBump.previousVersion} -> static-v${result.stableSync.cacheBump.nextVersion}.`);
        }
    } catch (error) {
        console.error(`Errore cut-release: ${error.message}`);
        process.exitCode = 1;
    }
}

const isCliEntry = Boolean(process.argv[1]) &&
    path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isCliEntry) {
    main();
}
