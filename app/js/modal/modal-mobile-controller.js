/* ============================================
   MODAL MOBILE CONTROLLER - focus/picker/back
   ============================================ */

export const ModalMobileController = (() => {
    const PICKER_FIELD_IDS = ['edit-data', 'edit-ora'];
    const KEYBOARD_TRANSITION_THRESHOLD = 100;

    function noop() { }

    function getDocument(options) {
        return options.document || (typeof document !== 'undefined' ? document : null);
    }

    function getWindow(options) {
        return options.window || (typeof window !== 'undefined' ? window : null);
    }

    function isAppleTouchDevice(options = {}) {
        if (typeof options.isAppleTouch === 'boolean') return options.isAppleTouch;

        const win = getWindow(options);
        const nav = options.navigator ||
            (win && win.navigator) ||
            (typeof navigator !== 'undefined' ? navigator : null);
        if (!nav) return false;

        const ua = String(nav.userAgent || '');
        const platform = String(nav.platform || '');
        const maxTouchPoints = Number(nav.maxTouchPoints || 0);

        return /iP(?:hone|ad|od)/i.test(ua) ||
            (platform === 'MacIntel' && maxTouchPoints > 1);
    }

    function getViewportHeight(options = {}) {
        const win = getWindow(options);
        const doc = getDocument(options);

        if (win.visualViewport && Number.isFinite(win.visualViewport.height)) {
            return win.visualViewport.height;
        }

        return win.innerHeight || (doc.documentElement && doc.documentElement.clientHeight) || 0;
    }

    function isModalOpen(options = {}) {
        return !!(options.isModalOpen && options.isModalOpen());
    }

    function getOpenDropdown(options = {}) {
        const doc = getDocument(options);
        if (!doc || typeof doc.querySelector !== 'function') return null;
        return doc.querySelector('#edit-modal .searchable-dropdown.open');
    }

    function getActivePlainField(options = {}) {
        const doc = getDocument(options);
        const modal = doc.getElementById('edit-modal');
        const el = doc.activeElement;

        if (!isModalOpen(options) || !modal || !el || !modal.contains(el)) return null;
        if (el.closest('.searchable-dropdown')) return null;

        if (el.matches('input[type="date"], input[type="time"]')) return null;
        return el.matches('input, textarea, select') ? el : null;
    }

    function blur(el) {
        try { el.blur(); } catch (_) { }
    }

    function clearPickerVisuals(doc) {
        PICKER_FIELD_IDS.forEach(id => {
            const el = doc.getElementById(id);
            if (el) el.classList.remove('picker-open');
        });
    }

    function bindNonStickyNativePicker(el, options = {}) {
        if (!el || typeof el.showPicker !== 'function') return;
        if (isAppleTouchDevice(options)) return;

        const doc = getDocument(options);
        const win = getWindow(options);
        const defer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : callback => callback());
        let openedProgrammatically = false;

        const clearSelection = () => {
            if (typeof options.clearSelection === 'function') {
                options.clearSelection();
            }
        };

        const openPicker = e => {
            openedProgrammatically = true;
            e.preventDefault();
            e.stopPropagation();

            clearSelection();

            if (doc.activeElement === el) blur(el);

            try {
                el.classList.add('picker-open');
                el.showPicker();
            } catch (_) {
                openedProgrammatically = false;
                el.classList.remove('picker-open');
                try { el.focus(); } catch (__) { }
                return;
            }

            defer(() => {
                if (doc.activeElement === el) blur(el);
                openedProgrammatically = false;
            }, 0);
        };

        el.addEventListener('pointerdown', openPicker);

        const closeVisuals = e => {
            if (e.target !== el) {
                el.classList.remove('picker-open');
            }
        };

        doc.addEventListener('pointerdown', closeVisuals, { passive: true });
        win.addEventListener('focus', () => {
            el.classList.remove('picker-open');
        });

        el.addEventListener('focus', () => {
            if (!openedProgrammatically) {
                blur(el);
                el.classList.remove('picker-open');
                return;
            }

            defer(() => {
                if (doc.activeElement === el) blur(el);
            }, 0);
        });

        el.addEventListener('change', () => {
            el.classList.remove('picker-open');
        });

        el.addEventListener('blur', () => {
            el.classList.remove('picker-open');
        });

        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (typeof el.showPicker !== 'function') return;
                e.preventDefault();

                clearSelection();

                try {
                    el.classList.add('picker-open');
                    el.showPicker();
                } catch (_) {
                    el.classList.remove('picker-open');
                }

                defer(() => {
                    if (doc.activeElement === el) blur(el);
                }, 0);
            } else if (e.key === 'Escape') {
                el.classList.remove('picker-open');
                blur(el);
            }
        });
    }

    function pushHistoryState(options = {}) {
        if (typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'modal' });
        }
    }

    function ensureInteractionState(options = {}) {
        if (!isModalOpen(options) ||
            (options.isInteractionActive && options.isInteractionActive())) {
            return;
        }

        if (typeof options.setInteractionActive === 'function') {
            options.setInteractionActive(true);
        }

        if (typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'modal-interaction' });
        }
    }

    function releaseInteractionState(options = {}) {
        if (!(options.isInteractionActive && options.isInteractionActive())) return;

        if (typeof options.setInteractionActive === 'function') {
            options.setInteractionActive(false);
        }

        if (typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
    }

    function clearSelection(options = {}) {
        const doc = getDocument(options);
        const win = getWindow(options);
        const dropdown = getOpenDropdown(options);

        if (dropdown) {
            const sdInput = dropdown.querySelector('.sd-input');
            if (sdInput) {
                blur(sdInput);
            }
            if (typeof options.closeDropdown === 'function') {
                options.closeDropdown(dropdown);
            } else if (!sdInput) {
                dropdown.classList.remove('open');
            }
        }

        const active = getActivePlainField(options);
        if (active) blur(active);

        clearPickerVisuals(doc);

        const sel = win.getSelection ? win.getSelection() : null;
        if (sel && sel.rangeCount > 0) {
            try { sel.removeAllRanges(); } catch (_) { }
        }
    }

    function shouldBlurForViewportChange(el, delta) {
        if (!el || delta <= KEYBOARD_TRANSITION_THRESHOLD) return false;

        const type = (el.type || '').toLowerCase();
        const isTextLike =
            el.tagName === 'TEXTAREA' ||
            ['text', 'number', 'search', 'email', 'tel', 'url', 'password'].includes(type);
        const isPicker = type === 'date' || type === 'time';

        return isTextLike || isPicker;
    }

    function handleViewportChange(options = {}) {
        const doc = getDocument(options);
        const currentHeight = getViewportHeight(options);
        const prevHeight = typeof options.getLastViewportHeight === 'function'
            ? options.getLastViewportHeight()
            : 0;
        const delta = prevHeight > 0 ? (currentHeight - prevHeight) : 0;

        if (prevHeight > 0) {
            if (isModalOpen(options)) {
                const active = getActivePlainField(options);

                if (shouldBlurForViewportChange(active, delta)) {
                    blur(active);
                }
            }

            if (options.isFilterOpen && options.isFilterOpen()) {
                const searchInput = doc.getElementById('search-input');
                if (searchInput && doc.activeElement === searchInput && delta > KEYBOARD_TRANSITION_THRESHOLD) {
                    blur(searchInput);
                }
            }

            if (options.getCurrentPage && options.getCurrentPage() === 'timeline') {
                const expenseInput = doc.getElementById('expense-input');
                if (expenseInput && doc.activeElement === expenseInput && delta > KEYBOARD_TRANSITION_THRESHOLD) {
                    blur(expenseInput);
                }
            }
        }

        if (typeof options.setLastViewportHeight === 'function') {
            options.setLastViewportHeight(currentHeight);
        }
    }

    function startViewportWatch(options = {}) {
        stopViewportWatch(options);

        if (typeof options.setLastViewportHeight === 'function') {
            options.setLastViewportHeight(getViewportHeight(options));
        }

        const setTimer = options.setInterval ||
            (typeof setInterval === 'function' ? setInterval : callback => callback());
        const timerId = setTimer(() => {
            handleViewportChange(options);
        }, 120);

        if (typeof options.setKeyboardWatchTimer === 'function') {
            options.setKeyboardWatchTimer(timerId);
        }
    }

    function stopViewportWatch(options = {}) {
        const timerId = typeof options.getKeyboardWatchTimer === 'function'
            ? options.getKeyboardWatchTimer()
            : null;
        const clearTimer = options.clearInterval ||
            (typeof clearInterval === 'function' ? clearInterval : noop);

        if (timerId) {
            clearTimer(timerId);
            if (typeof options.setKeyboardWatchTimer === 'function') {
                options.setKeyboardWatchTimer(null);
            }
        }
    }

    function blurPickerOnReturn(options = {}) {
        const doc = getDocument(options);
        const defer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : callback => callback());

        if (options.formController && typeof options.formController.clearPickerVisuals === 'function') {
            options.formController.clearPickerVisuals(doc);
        }

        if (!isModalOpen(options)) return;

        const active = getActivePlainField(options);
        if (!active) return;

        const type = (active.type || '').toLowerCase();
        if (type === 'date' || type === 'time') {
            defer(() => {
                if (doc.activeElement === active) blur(active);
            }, 0);
        }
    }

    function closestTarget(target, selector) {
        return target && typeof target.closest === 'function'
            ? target.closest(selector)
            : null;
    }

    function canScrollElementHorizontally(el) {
        if (!el || el.readOnly) return false;
        if (Number.isFinite(el.scrollWidth) && Number.isFinite(el.clientWidth)) {
            return el.scrollWidth > el.clientWidth;
        }
        return true;
    }

    /**
     * Prevents horizontal and non-scrollable rubber-band touch dragging while
     * preserving vertical scrolling inside configured containers.
     */
    function bindVerticalTouchLock(container, config = {}) {
        if (!container || typeof container.addEventListener !== 'function') return false;

        const scrollSelector = config.scrollSelector || '';
        const bypassSelector = config.bypassSelector || '';
        const nativeFieldSelector = config.nativeFieldSelector || '';
        let touchStart = null;
        let lockedAxis = null;

        const resetTouch = () => {
            touchStart = null;
            lockedAxis = null;
        };

        container.addEventListener('touchstart', event => {
            const touch = event && event.touches && event.touches[0];
            touchStart = touch
                ? { x: Number(touch.clientX || 0), y: Number(touch.clientY || 0) }
                : null;
            lockedAxis = null;
        }, { passive: true });

        container.addEventListener('touchmove', event => {
            if (!event) return;
            const target = event.target;

            if (bypassSelector) {
                const bypassEl = closestTarget(target, bypassSelector);
                if (bypassEl) {
                    const isTextarea = String(bypassEl.tagName || '').toUpperCase() === 'TEXTAREA';
                    if (!isTextarea || canScrollElementHorizontally(bypassEl)) {
                        return;
                    }
                }
            }

            const scrollEl = scrollSelector ? closestTarget(target, scrollSelector) : null;
            const cannotScrollVertically = !!scrollEl &&
                Number.isFinite(scrollEl.scrollHeight) &&
                Number.isFinite(scrollEl.clientHeight) &&
                scrollEl.scrollHeight <= scrollEl.clientHeight;
            const isNativeField = nativeFieldSelector && !!closestTarget(target, nativeFieldSelector);

            if (!scrollEl || (cannotScrollVertically && !isNativeField)) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                return;
            }

            const touch = event.touches && event.touches[0];
            if (!touchStart || !touch) return;

            const dx = Number(touch.clientX || 0) - touchStart.x;
            const dy = Number(touch.clientY || 0) - touchStart.y;

            if (!lockedAxis && Math.max(Math.abs(dx), Math.abs(dy)) >= 6) {
                lockedAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            }

            if (lockedAxis === 'x' && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
        }, { passive: false });

        container.addEventListener('touchend', resetTouch, { passive: true });
        container.addEventListener('touchcancel', resetTouch, { passive: true });

        return true;
    }

    function bindOverlayTouchLock(options = {}) {
        const doc = getDocument(options);
        if (!doc || typeof doc.querySelectorAll !== 'function') return 0;

        const overlays = Array.from(doc.querySelectorAll('.overlay') || []);
        let boundCount = 0;

        overlays.forEach(overlay => {
            if (bindVerticalTouchLock(overlay, {
                scrollSelector: '.modal-body, .sd-list',
                bypassSelector: 'textarea',
                nativeFieldSelector: 'input, textarea, select'
            })) {
                boundCount += 1;
            }
        });

        return boundCount;
    }

    return {
        getViewportHeight,
        getOpenDropdown,
        getActivePlainField,
        bindNonStickyNativePicker,
        pushHistoryState,
        ensureInteractionState,
        releaseInteractionState,
        clearSelection,
        handleViewportChange,
        startViewportWatch,
        stopViewportWatch,
        blurPickerOnReturn,
        bindVerticalTouchLock,
        bindOverlayTouchLock
    };
})();
