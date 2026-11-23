import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assert, root } from '../helpers.js';
import { syncPrecache } from '../../scripts/sync-precache.js';
import { cutRelease } from '../../scripts/cut-release.js';

function createTempWorkspace(withReleasesJson = false) {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wmm-release-scripts-'));
    fs.cpSync(path.join(root, 'app'), path.join(tempRoot, 'app'), { recursive: true });
    if (withReleasesJson) {
        fs.copyFileSync(path.join(root, 'releases.json'), path.join(tempRoot, 'releases.json'));
        fs.mkdirSync(path.join(tempRoot, 'releases'), { recursive: true });
    }
    return tempRoot;
}

export default function register(test) {
    test('syncPrecache --check verifica allineamento completo tra app/ e stable-launch-service-worker.js', () => {
        const appResult = syncPrecache({
            repoRoot: root,
            checkOnly: true
        });
        assert.equal(appResult.ok, true);
        assert.deepEqual(appResult.missing, []);
        assert.deepEqual(appResult.extra, []);
        assert.equal(appResult.total >= 69, true);

        const releaseResult = syncPrecache({
            repoRoot: root,
            targetDir: 'releases/v2026.06.03',
            checkOnly: true
        });
        assert.equal(releaseResult.ok, true);
        assert.deepEqual(releaseResult.missing, []);
        assert.deepEqual(releaseResult.extra, []);
    });

    test('syncPrecache rileva asset mancanti/obsoleti e aggiorna PRECACHE_URLS con o senza bump cache', () => {
        const tempRoot = createTempWorkspace(false);
        try {
            const swPath = path.join(tempRoot, 'app', 'stable-launch-service-worker.js');
            const initialSw = fs.readFileSync(swPath, 'utf8');
            const staticMatch = initialSw.match(/static-v(\d+)/);
            assert(staticMatch, 'Versione static-vN attesa in stable-launch-service-worker.js');
            const initialVersion = Number(staticMatch[1]);

            const dirtySw = initialSw
                .replace('  "./js/core/app.js",\r\n', '  "./js/fake-obsolete.js",\r\n')
                .replace('  "./js/core/app.js",\n', '  "./js/fake-obsolete.js",\n')
                .replace('  "./js/core/app.js"\r\n', '  "./js/fake-obsolete.js"\r\n')
                .replace('  "./js/core/app.js"\n', '  "./js/fake-obsolete.js"\n');
            assert.notEqual(dirtySw, initialSw);
            fs.writeFileSync(swPath, dirtySw, 'utf8');

            const brokenCheck = syncPrecache({ repoRoot: tempRoot, checkOnly: true });
            assert.equal(brokenCheck.ok, false);
            assert.equal(brokenCheck.missing.includes('./js/core/app.js'), true);
            assert.equal(brokenCheck.extra.includes('./js/fake-obsolete.js'), true);

            const synced = syncPrecache({ repoRoot: tempRoot });
            assert.equal(synced.ok, true);
            assert.equal(synced.changed, true);
            assert.equal(synced.cacheBump, null);

            const afterSyncSw = fs.readFileSync(swPath, 'utf8');
            assert.equal(afterSyncSw.includes('./js/core/app.js'), true);
            assert.equal(afterSyncSw.includes('./js/fake-obsolete.js'), false);
            assert.equal(afterSyncSw.includes(`static-v${initialVersion}`), true);

            const postCheck = syncPrecache({ repoRoot: tempRoot, checkOnly: true });
            assert.equal(postCheck.ok, true);

            const bumped = syncPrecache({ repoRoot: tempRoot, bumpCache: true });
            assert.deepEqual(bumped.cacheBump, {
                previousVersion: initialVersion,
                nextVersion: initialVersion + 1
            });
            const afterBumpSw = fs.readFileSync(swPath, 'utf8');
            assert.equal(afterBumpSw.includes(`static-v${initialVersion + 1}`), true);
        } finally {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
    });

    test('cutRelease supporta dry-run e crea una release scoped immutabile senza asset dev', () => {
        const tempRoot = createTempWorkspace(true);
        try {
            const manifestBefore = fs.readFileSync(path.join(tempRoot, 'releases.json'), 'utf8');

            const preview = cutRelease({
                repoRoot: tempRoot,
                releaseId: 'v2026.12.01',
                notes: 'Anteprima dry-run',
                dryRun: true
            });
            assert.equal(preview.dryRun, true);
            assert.equal(preview.precacheCount >= 69, true);
            assert.equal(preview.entry.date, '2026-12-01');
            assert.equal(preview.entry.schemaVersion, 1);
            assert.equal(fs.existsSync(path.join(tempRoot, 'releases', 'v2026.12.01')), false);
            assert.equal(fs.readFileSync(path.join(tempRoot, 'releases.json'), 'utf8'), manifestBefore);

            const created = cutRelease({
                repoRoot: tempRoot,
                releaseId: 'v2026.12.01',
                notes: 'Prima release automatizzata'
            });
            assert.equal(created.dryRun, false);

            const releaseDir = path.join(tempRoot, 'releases', 'v2026.12.01');
            assert.equal(fs.existsSync(releaseDir), true);
            assert.equal(fs.existsSync(path.join(releaseDir, 'manifest.dev.json')), false);
            assert.equal(fs.existsSync(path.join(releaseDir, 'icons', 'dev')), false);
            assert.equal(fs.existsSync(path.join(releaseDir, 'stable-launch-service-worker.js')), false);
            assert.equal(fs.existsSync(path.join(releaseDir, 'icons', 'stable', 'icon-192.png')), true);
            assert.equal(fs.existsSync(path.join(releaseDir, 'vendor', 'chart.umd.min.js')), true);

            const releaseHtml = fs.readFileSync(path.join(releaseDir, 'index.html'), 'utf8');
            assert.equal(releaseHtml.includes('.register("./service-worker.js", { scope: "./" })'), true);

            const releaseSw = fs.readFileSync(path.join(releaseDir, 'service-worker.js'), 'utf8');
            assert.equal(releaseSw.includes('const RELEASE_ID = "v2026.12.01";'), true);
            assert.equal(releaseSw.includes('url.href.startsWith(self.registration.scope)'), true);

            const releaseCheck = syncPrecache({
                repoRoot: tempRoot,
                targetDir: 'releases/v2026.12.01',
                checkOnly: true
            });
            assert.equal(releaseCheck.ok, true);

            const manifestAfter = JSON.parse(fs.readFileSync(path.join(tempRoot, 'releases.json'), 'utf8'));
            assert.equal(manifestAfter.recommended, 'v2026.12.01');
            assert.deepEqual(manifestAfter.releases[0], {
                id: 'v2026.12.01',
                path: 'releases/v2026.12.01/',
                date: '2026-12-01',
                status: 'recommended',
                notes: 'Prima release automatizzata',
                schemaVersion: 1
            });
            const previousRecommended = manifestAfter.releases.find(item => item.id === 'v2026.06.03');
            assert.equal(previousRecommended.status, 'stable');

            assert.throws(() => {
                cutRelease({
                    repoRoot: tempRoot,
                    releaseId: 'v2026.12.01',
                    notes: 'Duplicata'
                });
            }, /esiste gia/i);

            cutRelease({
                repoRoot: tempRoot,
                releaseId: 'v2026.12.02',
                notes: 'Release secondaria stabile',
                status: 'stable'
            });
            const manifestStable = JSON.parse(fs.readFileSync(path.join(tempRoot, 'releases.json'), 'utf8'));
            assert.equal(manifestStable.recommended, 'v2026.12.01');
            assert.equal(manifestStable.releases[0].id, 'v2026.12.02');
            assert.equal(manifestStable.releases[0].status, 'stable');
        } finally {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
    });
}
