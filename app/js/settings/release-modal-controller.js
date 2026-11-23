/* ============================================
   RELEASE MODAL CONTROLLER - finestra versioni
   ============================================ */

import { SettingsActions } from './settings-actions.js';
import { SettingsView } from './settings-view.js';

export const ReleaseModalController = (() => {
    let boundModals = new WeakSet();

    function getReleaseModal(options = {}) {
        const doc = options.document || (typeof document === 'undefined' ? null : document);
        if (!doc || typeof doc.getElementById !== 'function') return null;

        return doc.getElementById('release-modal-overlay');
    }

    function renderReleaseModel(container, model, options = {}) {
        const doc = options.document || null;
        const releaseList = (container && container.querySelector('#release-modal-list')) ||
            (doc && doc.getElementById('release-modal-list'));
        if (!releaseList) return;

        releaseList.innerHTML = SettingsView.renderReleaseList(model);
    }

    function loadReleases(container, options = {}) {
        const fetchFn = options.fetchFn;
        const locationLike = options.locationLike || {};

        if (typeof fetchFn !== 'function') {
            renderReleaseModel(container, {
                status: 'error',
                message: 'Apri l app da server HTTP/HTTPS per leggere releases.json.'
            }, options);
            return Promise.resolve();
        }

        const releasesUrl = SettingsActions.getReleasesManifestUrl(locationLike);
        const currentReleaseId = SettingsActions.getCurrentReleaseId(locationLike);

        renderReleaseModel(container, { status: 'loading' }, options);

        return fetchFn(releasesUrl, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            })
            .then(manifest => {
                const releaseModel = SettingsActions.normalizeReleaseManifest(manifest, {
                    releasesUrl,
                    currentReleaseId,
                    channel: (options.appConfig || {}).channel
                });

                renderReleaseModel(container, {
                    status: 'ready',
                    ...releaseModel
                }, options);
            })
            .catch(error => {
                renderReleaseModel(container, {
                    status: 'error',
                    message: error && error.message ? error.message : 'Errore sconosciuto.'
                }, options);
            });
    }

    function open(options = {}) {
        const modal = getReleaseModal(options);
        if (!modal) return;

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.remove('hidden');

        if (!wasOpen && typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'release-modal' });
        }
    }

    function close(options = {}, fromPopstate = false) {
        const modal = getReleaseModal(options);
        if (!modal) return;

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.add('hidden');

        if (wasOpen && !fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
    }

    function isOpen(options = {}) {
        const modal = getReleaseModal(options);

        return !!(modal && !modal.classList.contains('hidden'));
    }

    function getCurrentPage(options = {}) {
        return typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : '';
    }

    function getVersionSwitchHistorySteps(options = {}) {
        if (Number.isFinite(options.historySteps)) {
            return Math.max(0, Number(options.historySteps));
        }

        const currentPage = getCurrentPage(options);
        const pageStep = currentPage && currentPage !== 'timeline' ? 1 : 0;

        return 1 + pageStep;
    }

    function replaceLocation(url, options = {}) {
        const locationLike = options.locationLike;
        if (locationLike && typeof locationLike.replace === 'function') {
            locationLike.replace(url);
            return true;
        }

        if (locationLike) {
            locationLike.href = url;
            return true;
        }

        return false;
    }

    function replaceLocationAfterHistoryCleanup(url, options = {}) {
        const steps = getVersionSwitchHistorySteps(options);
        const canConsumeHistory = steps > 0 && typeof options.consumeUiState === 'function';

        if (!canConsumeHistory) {
            return replaceLocation(url, options);
        }

        const win = options.window || (typeof window === 'undefined' ? null : window);
        const setTimer = options.setTimeout ||
            (win && typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : null);
        let done = false;
        let removeListener = null;
        const finish = () => {
            if (done) return;
            done = true;
            if (removeListener) removeListener();
            replaceLocation(url, options);
        };

        if (win && typeof win.addEventListener === 'function') {
            const onPopstate = () => finish();
            win.addEventListener('popstate', onPopstate, { once: true });
            removeListener = () => {
                if (typeof win.removeEventListener === 'function') {
                    win.removeEventListener('popstate', onPopstate);
                }
            };
        }

        const consumed = options.consumeUiState(steps);
        if (!consumed) {
            finish();
            return true;
        }

        if (setTimer) {
            setTimer(finish, 700);
        } else if (!win) {
            finish();
        }

        return true;
    }

    function installReleaseFromLink(link, options = {}) {
        if (!link) return false;

        if (typeof SettingsActions.createVersionChangeSnapshot === 'function') {
            const snapshot = SettingsActions.createVersionChangeSnapshot({
                storage: options.storage
            });

            if (!snapshot.success) {
                if (typeof options.showToast === 'function') {
                    options.showToast(
                        snapshot.error || 'Snapshot prima del cambio versione non riuscito',
                        'error'
                    );
                }
                return false;
            }
        }

        SettingsActions.setLaunchTarget(
            link.dataset.launchPath || '',
            options.localStorage
        );

        return replaceLocationAfterHistoryCleanup(link.href, options);
    }

    function isBound(modal) {
        return !!(modal && typeof modal === 'object' && boundModals.has(modal));
    }

    function getState(optionsOrModal = {}) {
        const modal = optionsOrModal &&
            typeof optionsOrModal === 'object' &&
            (optionsOrModal.id === 'release-modal-overlay' ||
                typeof optionsOrModal.querySelector === 'function' ||
                typeof optionsOrModal.addEventListener === 'function')
            ? optionsOrModal
            : getReleaseModal(optionsOrModal);
        if (!modal || typeof modal !== 'object') return null;

        return {
            bound: isBound(modal)
        };
    }

    function resetState() {
        boundModals = new WeakSet();
    }

    function bind(options = {}) {
        const modal = getReleaseModal(options);
        if (!modal || isBound(modal)) return;

        boundModals.add(modal);

        const closeBtn = modal.querySelector('#release-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => close(options));
        }

        modal.addEventListener('click', event => {
            if (event.target.id === 'release-modal-overlay') {
                close(options);
                return;
            }

            const link = event.target.closest('.release-install-link');
            if (!link) return;

            event.preventDefault();
            installReleaseFromLink(link, options);
        });
    }

    return {
        loadReleases,
        open,
        close,
        isOpen,
        isBound,
        getState,
        resetState,
        bind,
        installReleaseFromLink
    };
})();
