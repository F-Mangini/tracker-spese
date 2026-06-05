/* ============================================
   MODAL MOBILE CONTROLLER - focus/picker/viewport
   ============================================ */

const ModalMobileController = (() => {
    const DROPDOWN_TOP_GAP = 8;
    const DROPDOWN_BOTTOM_GAP = 6;

    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getWindow(options) {
        return options.window || window;
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
        return doc.querySelector('#edit-modal .searchable-dropdown.open');
    }

    function getDropdownVisibleRect(dropdown) {
        const dropdownRect = dropdown.getBoundingClientRect();
        const list = typeof dropdown.querySelector === 'function'
            ? dropdown.querySelector('.sd-list')
            : null;

        if (!list || typeof list.getBoundingClientRect !== 'function') {
            return dropdownRect;
        }

        const listRect = list.getBoundingClientRect();

        return {
            top: Math.min(dropdownRect.top, listRect.top),
            bottom: Math.max(dropdownRect.bottom, listRect.bottom)
        };
    }

    function scrollElementBy(element, delta) {
        if (!element || !Number.isFinite(element.scrollTop) || !Number.isFinite(delta) || Math.abs(delta) < 1) {
            return 0;
        }

        const previous = element.scrollTop;
        if (Number.isFinite(element.scrollHeight) && Number.isFinite(element.clientHeight)) {
            const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
            element.scrollTop = Math.min(maxScroll, Math.max(0, previous + delta));
        } else {
            element.scrollTop = previous + delta;
        }

        return element.scrollTop - previous;
    }

    function scrollPageBy(delta, options = {}) {
        if (!Number.isFinite(delta) || Math.abs(delta) < 1) return 0;

        const doc = getDocument(options);
        const scrollingElement = doc && (doc.scrollingElement || doc.documentElement || doc.body);
        let consumed = scrollElementBy(scrollingElement, delta);
        const remaining = delta - consumed;

        if (Math.abs(remaining) < 1) return consumed;

        const win = getWindow(options);
        if (win && typeof win.scrollBy === 'function') {
            try {
                win.scrollBy({ top: remaining, behavior: 'smooth' });
            } catch (_) {
                win.scrollBy(0, remaining);
            }
            consumed += remaining;
        }

        return consumed;
    }

    function getOverflow(rect, topLimit, bottomLimit) {
        const overflowBottom = rect.bottom - bottomLimit;
        if (overflowBottom > 0) return overflowBottom;

        const overflowTop = topLimit - rect.top;
        if (overflowTop > 0) return -overflowTop;

        return 0;
    }

    function revealDropdown(dropdown, options = {}) {
        if (!dropdown || typeof dropdown.getBoundingClientRect !== 'function') return;
        if (dropdown.classList && !dropdown.classList.contains('open')) return;

        const modalBody = typeof dropdown.closest === 'function'
            ? dropdown.closest('.modal-body')
            : null;
        const bodyRect = modalBody && typeof modalBody.getBoundingClientRect === 'function'
            ? modalBody.getBoundingClientRect()
            : null;
        const viewportHeight = getViewportHeight(options);
        const rect = getDropdownVisibleRect(dropdown);

        if (!viewportHeight) {
            if (typeof dropdown.scrollIntoView === 'function') {
                dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
        }

        if (modalBody && bodyRect && Number.isFinite(modalBody.scrollTop)) {
            const bodyBottom = Math.min(viewportHeight - DROPDOWN_BOTTOM_GAP, bodyRect.bottom - DROPDOWN_BOTTOM_GAP);
            const bodyTop = Math.max(DROPDOWN_TOP_GAP, bodyRect.top + DROPDOWN_TOP_GAP);
            const bodyDelta = getOverflow(rect, bodyTop, bodyBottom);

            if (bodyDelta) {
                scrollElementBy(modalBody, bodyDelta);
            }
        }

        const updatedRect = getDropdownVisibleRect(dropdown);
        const pageDelta = getOverflow(
            updatedRect,
            DROPDOWN_TOP_GAP,
            viewportHeight - DROPDOWN_BOTTOM_GAP
        );

        if (pageDelta) {
            scrollPageBy(pageDelta, options);
        }
    }

    function scheduleDropdownReveal(options = {}) {
        const dropdown = getOpenDropdown(options);
        if (!dropdown) return;

        revealDropdown(dropdown, options);

        const defer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : callback => callback());
        defer(() => revealDropdown(getOpenDropdown(options), options), 90);
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

    function bindNonStickyNativePicker(el, options = {}) {
        if (!el || typeof el.showPicker !== 'function') return;

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
        win.addEventListener('focus', () => el.classList.remove('picker-open'));

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
            } else {
                dropdown.classList.remove('open');
            }
        }

        const active = getActivePlainField(options);
        if (active) blur(active);

        ['edit-data', 'edit-ora'].forEach(id => {
            const el = doc.getElementById(id);
            if (el) el.classList.remove('picker-open');
        });

        const sel = win.getSelection ? win.getSelection() : null;
        if (sel && sel.rangeCount > 0) {
            try { sel.removeAllRanges(); } catch (_) { }
        }
    }

    function shouldBlurForViewportChange(el, delta) {
        if (!el || delta <= 100) return false;

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
                if (shouldBlurForViewportChange(active, delta)) blur(active);
                scheduleDropdownReveal(options);
            }

            if (options.isFilterOpen && options.isFilterOpen()) {
                const searchInput = doc.getElementById('search-input');
                if (searchInput && doc.activeElement === searchInput && delta > 100) {
                    blur(searchInput);
                }
            }

            if (options.getCurrentPage && options.getCurrentPage() === 'timeline') {
                const expenseInput = doc.getElementById('expense-input');
                if (expenseInput && doc.activeElement === expenseInput && delta > 100) {
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

    return {
        getViewportHeight,
        getOpenDropdown,
        getActivePlainField,
        revealDropdown,
        bindNonStickyNativePicker,
        pushHistoryState,
        ensureInteractionState,
        releaseInteractionState,
        clearSelection,
        handleViewportChange,
        startViewportWatch,
        stopViewportWatch,
        blurPickerOnReturn
    };
})();
