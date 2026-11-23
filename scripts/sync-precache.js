import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    collectPrecacheUrls,
    parsePrecacheUrls,
    diffPrecacheUrls,
    replacePrecacheUrls,
    bumpStaticCacheVersion
} from './lib/pwa-assets.js';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseSyncArgs(argv = []) {
    const args = {
        checkOnly: false,
        bumpCache: false,
        targetDir: 'app',
        serviceWorkerFile: null,
        help: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--check') {
            args.checkOnly = true;
        } else if (arg === '--bump-cache') {
            args.bumpCache = true;
        } else if (arg === '--help' || arg === '-h') {
            args.help = true;
        } else if (arg === '--target') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --target');
            args.targetDir = argv[i];
        } else if (arg === '--sw') {
            i += 1;
            if (i >= argv.length) throw new Error('Valore mancante per --sw');
            args.serviceWorkerFile = argv[i];
        } else {
            throw new Error(`Opzione non riconosciuta: ${arg}`);
        }
    }

    return args;
}

export function syncPrecache(options = {}) {
    const repoRoot = path.resolve(options.repoRoot || DEFAULT_ROOT);
    const targetDirInput = options.targetDir || 'app';
    const resolvedTargetDir = path.isAbsolute(targetDirInput)
        ? path.resolve(targetDirInput)
        : path.resolve(repoRoot, targetDirInput);
    const appDir = path.resolve(repoRoot, 'app');
    const serviceWorkerFile = options.serviceWorkerFile || (
        resolvedTargetDir.toLowerCase() === appDir.toLowerCase()
            ? 'stable-launch-service-worker.js'
            : 'service-worker.js'
    );
    const bumpCache = !!options.bumpCache;
    const checkOnly = !!options.checkOnly;

    const swPath = path.join(resolvedTargetDir, serviceWorkerFile);
    if (!fs.existsSync(swPath)) {
        throw new Error(`Service worker non trovato: ${swPath}`);
    }

    const expectedUrls = collectPrecacheUrls(resolvedTargetDir, { serviceWorkerFile });
    const currentSource = fs.readFileSync(swPath, 'utf8');
    const actualUrls = parsePrecacheUrls(currentSource);
    const diff = diffPrecacheUrls(expectedUrls, actualUrls);

    if (checkOnly) {
        return {
            ok: diff.inSync,
            missing: diff.missing,
            extra: diff.extra,
            total: expectedUrls.length,
            swPath
        };
    }

    let nextSource = replacePrecacheUrls(currentSource, expectedUrls);
    let cacheBump = null;

    if (bumpCache) {
        const bumped = bumpStaticCacheVersion(nextSource);
        nextSource = bumped.source;
        cacheBump = {
            previousVersion: bumped.previousVersion,
            nextVersion: bumped.nextVersion
        };
    }

    const changed = nextSource !== currentSource;
    if (changed) {
        fs.writeFileSync(swPath, nextSource, 'utf8');
    }

    return {
        ok: true,
        changed,
        total: expectedUrls.length,
        missing: diff.missing,
        extra: diff.extra,
        cacheBump,
        swPath
    };
}

function printUsage() {
    console.log([
        'Uso: node scripts/sync-precache.js [opzioni]',
        '',
        'Opzioni:',
        '  --check          Verifica solo che PRECACHE_URLS sia allineato senza modificare file',
        '  --bump-cache     Incrementa STATIC_CACHE static-v<N> di +1',
        '  --target <dir>   Cartella target relativa alla root o assoluta (default: app)',
        '  --sw <file>      Nome del file service worker nella cartella target',
        '  -h, --help       Mostra questo aiuto'
    ].join('\n'));
}

function main() {
    try {
        const args = parseSyncArgs(process.argv.slice(2));
        if (args.help) {
            printUsage();
            return;
        }

        const result = syncPrecache(args);
        const relSw = path.relative(DEFAULT_ROOT, result.swPath).replace(/\\/g, '/') || result.swPath;

        if (args.checkOnly) {
            if (!result.ok) {
                console.error(`Precache NON allineato in ${relSw}:`);
                if (result.missing.length) {
                    console.error(`  Mancanti (${result.missing.length}): ${result.missing.join(', ')}`);
                }
                if (result.extra.length) {
                    console.error(`  Obsoleti (${result.extra.length}): ${result.extra.join(', ')}`);
                }
                process.exitCode = 1;
                return;
            }

            console.log(`Precache OK (${result.total} asset verificati) in ${relSw}.`);
            return;
        }

        const parts = [
            result.changed ? `Aggiornato ${relSw}` : `Nessuna modifica necessaria in ${relSw}`,
            `(${result.total} asset)`
        ];
        if (result.cacheBump) {
            parts.push(`STATIC_CACHE: static-v${result.cacheBump.previousVersion} -> static-v${result.cacheBump.nextVersion}`);
        }
        console.log(parts.join(' | '));
    } catch (error) {
        console.error(`Errore sync-precache: ${error.message}`);
        process.exitCode = 1;
    }
}

const isCliEntry = Boolean(process.argv[1]) &&
    path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isCliEntry) {
    main();
}
