import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SHELL_URLS = [
    './',
    './index.html',
    './manifest.json'
];

export function normalizePrecachePath(value) {
    const cleaned = String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\/+/, '');

    if (!cleaned || cleaned === '.') {
        return './';
    }

    return './' + path.posix.normalize(cleaned);
}

export function extractRelativeModuleSpecifiers(source) {
    const specifiers = [];
    const lines = String(source || '').split(/\r?\n/);
    let buffer = '';
    let collecting = false;

    for (const line of lines) {
        if (!collecting) {
            if (/^\s*(?:import|export\s+(?:\*|\{))/.test(line)) {
                collecting = true;
                buffer = line;
            } else {
                continue;
            }
        } else {
            buffer += ' ' + line;
        }

        const bareMatch = buffer.match(/^\s*import\s+["'](\.[^"']+)["']\s*;?/);
        if (bareMatch) {
            specifiers.push(bareMatch[1]);
            collecting = false;
            buffer = '';
            continue;
        }

        const fromMatch = buffer.match(/\bfrom\s+["'](\.[^"']+)["']/);
        if (fromMatch) {
            specifiers.push(fromMatch[1]);
            collecting = false;
            buffer = '';
            continue;
        }

        if (buffer.includes(';')) {
            collecting = false;
            buffer = '';
        }
    }

    return specifiers;
}

export function collectModuleGraph(baseDir, entryRelativePath) {
    const visited = new Set();
    const visiting = new Set();
    const cycles = [];
    const files = [];

    function visit(relPosixPath) {
        const normalized = path.posix.normalize(
            String(relPosixPath || '')
                .replace(/\\/g, '/')
                .replace(/^\.\//, '')
        );

        if (visiting.has(normalized)) {
            cycles.push(normalized);
            return;
        }
        if (visited.has(normalized)) return;

        const fullPath = path.resolve(baseDir, normalized);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Modulo ES non trovato: ${normalized}`);
        }

        visiting.add(normalized);
        const source = fs.readFileSync(fullPath, 'utf8');
        const dir = path.posix.dirname(normalized);

        for (const specifier of extractRelativeModuleSpecifiers(source)) {
            const target = path.posix.normalize(path.posix.join(dir, specifier));
            visit(target);
        }

        visiting.delete(normalized);
        visited.add(normalized);
        files.push(normalized);
    }

    visit(entryRelativePath);

    return { files, cycles };
}

function isLocalAssetReference(value) {
    return Boolean(value) && !/^(https?:|data:|#)/i.test(value);
}

function sortPrecacheUrls(candidates, options = {}) {
    const cssOrder = options.cssOrder || new Map();
    const swPath = normalizePrecachePath(options.serviceWorkerFile || 'stable-launch-service-worker.js');
    const shellOrder = new Map([
        ['./', 0],
        ['./index.html', 1],
        ['./manifest.json', 2],
        [swPath, 3]
    ]);

    function getGroup(item) {
        if (shellOrder.has(item)) return 0;
        if (item.startsWith('./css/')) return 1;
        if (item.startsWith('./vendor/')) return 2;
        if (item.startsWith('./icons/')) return 3;
        if (item.startsWith('./js/')) return 4;
        return 5;
    }

    return Array.from(new Set(candidates)).sort((left, right) => {
        const groupDiff = getGroup(left) - getGroup(right);
        if (groupDiff !== 0) return groupDiff;

        const group = getGroup(left);
        if (group === 0) {
            return shellOrder.get(left) - shellOrder.get(right);
        }
        if (group === 1) {
            const leftIdx = cssOrder.has(left) ? cssOrder.get(left) : Number.MAX_SAFE_INTEGER;
            const rightIdx = cssOrder.has(right) ? cssOrder.get(right) : Number.MAX_SAFE_INTEGER;
            if (leftIdx !== rightIdx) return leftIdx - rightIdx;
        }
        if (group === 4) {
            if (left === './js/core/config.js') return -1;
            if (right === './js/core/config.js') return 1;
        }

        return left.localeCompare(right, 'en');
    });
}

export function collectPrecacheUrls(baseDir, options = {}) {
    const resolvedBaseDir = path.resolve(baseDir);
    const serviceWorkerFile = options.serviceWorkerFile || 'stable-launch-service-worker.js';
    const swPrecachePath = normalizePrecachePath(serviceWorkerFile);
    const verifyServiceWorkerExists = options.verifyServiceWorkerExists !== false;

    const indexPath = path.join(resolvedBaseDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
        throw new Error(`index.html non trovato in ${resolvedBaseDir}`);
    }

    const html = fs.readFileSync(indexPath, 'utf8');
    const collected = [...DEFAULT_SHELL_URLS, swPrecachePath];
    const cssOrder = new Map();
    const tagPattern = /<(script|link)\b([^>]*)>/gi;
    let match;

    while ((match = tagPattern.exec(html))) {
        const tagName = match[1].toLowerCase();
        const attrs = match[2];
        const attrMatch = tagName === 'script'
            ? /\bsrc=["']([^"']+)["']/i.exec(attrs)
            : /\bhref=["']([^"']+)["']/i.exec(attrs);

        if (!attrMatch) continue;

        const rawValue = attrMatch[1];
        if (!isLocalAssetReference(rawValue)) continue;

        const normalized = normalizePrecachePath(rawValue);
        collected.push(normalized);

        if (tagName === 'link' && /\brel=["']stylesheet["']/i.test(attrs) && !cssOrder.has(normalized)) {
            cssOrder.set(normalized, cssOrder.size);
        }

        if (tagName === 'script' && /\btype\s*=\s*["']module["']/i.test(attrs)) {
            const graph = collectModuleGraph(resolvedBaseDir, rawValue);
            if (graph.cycles.length > 0) {
                throw new Error(`Dipendenze circolari nel grafo ES Module: ${graph.cycles.join(', ')}`);
            }
            graph.files.forEach(file => collected.push(normalizePrecachePath(file)));
        }
    }

    const manifestPath = path.join(resolvedBaseDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
        for (const icon of icons) {
            if (icon && isLocalAssetReference(icon.src)) {
                collected.push(normalizePrecachePath(icon.src));
            }
        }
    }

    const sorted = sortPrecacheUrls(collected, {
        cssOrder,
        serviceWorkerFile
    });

    for (const urlPath of sorted) {
        if (urlPath === './') continue;
        if (urlPath === swPrecachePath && !verifyServiceWorkerExists) continue;

        const relDiskPath = urlPath.replace(/^\.\//, '');
        const fullAssetPath = path.join(resolvedBaseDir, relDiskPath);
        if (!fs.existsSync(fullAssetPath)) {
            throw new Error(`Asset locale mancante su disco: ${relDiskPath} (in ${resolvedBaseDir})`);
        }
    }

    return sorted;
}

export function parsePrecacheUrls(swSource) {
    const listMatch = String(swSource || '').match(/const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);
    if (!listMatch) {
        throw new Error('Dichiarazione PRECACHE_URLS non trovata nel service worker');
    }

    return Array.from(listMatch[1].matchAll(/["']([^"']+)["']/g))
        .map(match => normalizePrecachePath(match[1]));
}

export function diffPrecacheUrls(expectedUrls, actualUrls) {
    const expectedNormalized = Array.from(new Set((expectedUrls || []).map(normalizePrecachePath)));
    const actualNormalized = Array.from(new Set((actualUrls || []).map(normalizePrecachePath)));
    const expectedSet = new Set(expectedNormalized);
    const actualSet = new Set(actualNormalized);

    const missing = expectedNormalized.filter(url => !actualSet.has(url));
    const extra = actualNormalized.filter(url => !expectedSet.has(url));

    return {
        missing,
        extra,
        inSync: missing.length === 0 && extra.length === 0
    };
}

export function replacePrecacheUrls(swSource, urls) {
    const source = String(swSource || '');
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const pattern = /const\s+PRECACHE_URLS\s*=\s*\[[\s\S]*?\];/;

    if (!pattern.test(source)) {
        throw new Error('Dichiarazione PRECACHE_URLS non trovata nel service worker');
    }

    const itemsBlock = urls.map(url => `  ${JSON.stringify(normalizePrecachePath(url))}`).join(`,${eol}`);
    const replacement = `const PRECACHE_URLS = [${eol}${itemsBlock}${eol}];`;

    return source.replace(pattern, replacement);
}

export function bumpStaticCacheVersion(swSource) {
    const source = String(swSource || '');
    const pattern = /(const\s+STATIC_CACHE\s*=\s*`\$\{CACHE_PREFIX\}static-v)(\d+)(`\s*;)/;
    const match = source.match(pattern);

    if (!match) {
        throw new Error('Dichiarazione STATIC_CACHE static-v<N> non trovata nel service worker');
    }

    const previousVersion = Number(match[2]);
    const nextVersion = previousVersion + 1;
    const updatedSource = source.replace(pattern, `$1${nextVersion}$3`);

    return {
        source: updatedSource,
        previousVersion,
        nextVersion
    };
}

export function detectSchemaVersion(repoRoot) {
    const storagePath = path.join(repoRoot, 'app', 'js', 'data', 'storage.js');
    if (!fs.existsSync(storagePath)) return 1;

    const storageSource = fs.readFileSync(storagePath, 'utf8');
    const match = storageSource.match(/\bSCHEMA_VERSION\s*:\s*(\d+)/);
    const version = match ? Number(match[1]) : 1;

    return Number.isInteger(version) && version > 0 ? version : 1;
}

export function renderReleaseServiceWorker({
    releaseId,
    cacheVersion = 1,
    precacheUrls = [],
    eol = '\n'
}) {
    const precacheLines = precacheUrls
        .map(url => `  ${JSON.stringify(normalizePrecachePath(url))}`)
        .join(`,${eol}`);

    const lines = [
        `const RELEASE_ID = ${JSON.stringify(releaseId)};`,
        'const CACHE_PREFIX = `wmm-${RELEASE_ID}-`;',
        `const STATIC_CACHE = \`\${CACHE_PREFIX}static-v${cacheVersion}\`;`,
        '',
        'const PRECACHE_URLS = [',
        precacheLines,
        '];',
        '',
        'function isReleaseRequest(request) {',
        '  const url = new URL(request.url);',
        '',
        '  return (',
        '    request.method === "GET" &&',
        '    url.origin === self.location.origin &&',
        '    url.href.startsWith(self.registration.scope)',
        '  );',
        '}',
        '',
        'async function readFromCacheFirst(request) {',
        '  const cachedResponse = await caches.match(request);',
        '',
        '  if (cachedResponse) {',
        '    return cachedResponse;',
        '  }',
        '',
        '  const networkResponse = await fetch(request);',
        '',
        '  if (networkResponse.ok) {',
        '    const cache = await caches.open(STATIC_CACHE);',
        '    await cache.put(request, networkResponse.clone());',
        '  }',
        '',
        '  return networkResponse;',
        '}',
        '',
        'self.addEventListener("install", (event) => {',
        '  event.waitUntil(',
        '    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))',
        '  );',
        '  self.skipWaiting();',
        '});',
        '',
        'self.addEventListener("activate", (event) => {',
        '  event.waitUntil(',
        '    Promise.all([',
        '      caches.keys().then((cacheNames) =>',
        '        Promise.all(',
        '          cacheNames',
        '            .filter((cacheName) => (',
        '              cacheName.startsWith(CACHE_PREFIX) &&',
        '              cacheName !== STATIC_CACHE',
        '            ))',
        '            .map((cacheName) => caches.delete(cacheName))',
        '        )',
        '      ),',
        '      self.clients.claim()',
        '    ])',
        '  );',
        '});',
        '',
        'self.addEventListener("fetch", (event) => {',
        '  const { request } = event;',
        '',
        '  if (!isReleaseRequest(request)) {',
        '    return;',
        '  }',
        '',
        '  if (request.mode === "navigate") {',
        '    event.respondWith(',
        '      caches.match("./index.html").then((cachedIndex) => (',
        '        cachedIndex || fetch(request)',
        '      ))',
        '    );',
        '    return;',
        '  }',
        '',
        '  event.respondWith(readFromCacheFirst(request));',
        '});',
        ''
    ];

    return lines.join(eol);
}

export function injectReleaseServiceWorkerRegistration(indexHtml) {
    const html = String(indexHtml || '');
    if (/\.register\(\s*["']\.\/service-worker\.js["']/.test(html)) {
        return html;
    }

    const eol = html.includes('\r\n') ? '\r\n' : '\n';
    const snippet = [
        '    <script>',
        '        if ("serviceWorker" in navigator) {',
        '            window.addEventListener("load", () => {',
        '                navigator.serviceWorker',
        '                    .register("./service-worker.js", { scope: "./" })',
        '                    .catch((error) => {',
        '                        console.warn("Service worker release non registrato.", error);',
        '                    });',
        '            });',
        '        }',
        '    </script>'
    ].join(eol);

    if (!/<\/body>/i.test(html)) {
        throw new Error('Tag </body> non trovato in index.html della release');
    }

    return html.replace(/<\/body>/i, `${snippet}${eol}</body>`);
}
