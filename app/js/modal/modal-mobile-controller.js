/* ============================================
   MODAL MOBILE CONTROLLER - focus/picker/viewport
   ============================================ */

const ModalMobileController = (() => {
    const DROPDOWN_TOP_GAP = 8;
    const DROPDOWN_BOTTOM_GAP = 6;
    const MODAL_TOP_GAP = 8;
    const BODY_EXTRA_GAP = 12;
    const DEFAULT_BODY_PADDING_BOTTOM = 16;
    const PLAIN_FIELD_IDS = ['edit-importo', 'edit-descrizione', 'edit-nota'];

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

    function getKeyboardInset(options = {}) {
        const win = getWindow(options);
        const vv = win.visualViewport;

        if (!vv || !Number.isFinite(vv.height)) return 0;

        const offsetTop = Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0;
        const inset = win.innerHeight - (offsetTop + vv.height);

        return Math.max(0, Math.round(inset));
    }

    function isModalOpen(options = {}) {
        return !!(options.isModalOpen && options.isModalOpen());
    }

    function getOpenDropdown(options = {}) {
        const doc = getDocument(options);
        return doc.querySelector('#edit-modal .searchable-dropdown.open');
    }

    function getModalParts(options = {}) {
        const doc = getDocument(options);
        const overlay = doc.getElementById('modal-overlay');
        const modal = doc.getElementById('edit-modal');
        const body = modal && typeof modal.querySelector === 'function'
            ? modal.querySelector('.modal-body')
            : null;
        const footer = modal && typeof modal.querySelector === 'function'
            ? modal.querySelector('.modal-footer')
            : null;

        return { overlay, modal, body, footer };
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

    function getOverflow(rect, topLimit, bottomLimit) {
        const overflowBottom = rect.bottom - bottomLimit;
        if (overflowBottom > 0) return overflowBottom;

        const overflowTop = topLimit - rect.top;
        if (overflowTop > 0) return -overflowTop;

        return 0;
    }

    function getBaseBodyPaddingBottom(body, options = {}) {
        if (!body || !body.dataset) return DEFAULT_BODY_PADDING_BOTTOM;
        if (body.dataset.basePaddingBottom) {
            const saved = Number(body.dataset.basePaddingBottom);
            return Number.isFinite(saved) ? saved : DEFAULT_BODY_PADDING_BOTTOM;
        }

        const win = getWindow(options);
        const style = win && typeof win.getComputedStyle === 'function'
            ? win.getComputedStyle(body)
            : null;
        const value = style ? Number.parseFloat(style.paddingBottom) : DEFAULT_BODY_PADDING_BOTTOM;
        const base = Number.isFinite(value) ? value : DEFAULT_BODY_PADDING_BOTTOM;

        body.dataset.basePaddingBottom = String(base);
        return base;
    }

    function setBodyExtraSpace(body, extraSpace = 0, options = {}) {
        if (!body || !body.style) return;

        const extra = Math.max(0, Math.ceil(Number(extraSpace) || 0));
        if (extra <= 0) {
            body.style.paddingBottom = '';
            return;
        }

        body.style.paddingBottom = `${getBaseBodyPaddingBottom(body, options) + extra}px`;
    }

    function getDropdownExtraSpace(dropdown) {
        if (!dropdown || !dropdown.classList || !dropdown.classList.contains('open')) return 0;

        const list = typeof dropdown.querySelector === 'function'
            ? dropdown.querySelector('.sd-list')
            : null;
        if (!list || typeof list.getBoundingClientRect !== 'function') return 0;

        const rect = list.getBoundingClientRect();
        const height = Number.isFinite(rect.height)
            ? rect.height
            : Number.isFinite(rect.bottom) && Number.isFinite(rect.top)
                ? rect.bottom - rect.top
                : 0;

        return Math.max(0, height + BODY_EXTRA_GAP);
    }

    function updateViewportLayout(options = {}, config = {}) {
        const { overlay, modal, body } = getModalParts(options);
        const viewportHeight = getViewportHeight(options);
        const keyboardInset = getKeyboardInset(options);
        const hasKeyboard = keyboardInset > 0;

        if (overlay && overlay.style) {
            overlay.style.paddingBottom = hasKeyboard ? `${keyboardInset}px` : '';
        }

        if (modal && modal.style) {
            modal.style.maxHeight = hasKeyboard && viewportHeight
                ? `${Math.max(240, viewportHeight - MODAL_TOP_GAP)}px`
                : '';
        }

        setBodyExtraSpace(body, config.extraBodySpace || 0, options);
    }

    function clearViewportLayout(options = {}) {
        const { overlay, modal, body } = getModalParts(options);

        if (overlay && overlay.style) overlay.style.paddingBottom = '';
        if (modal && modal.style) modal.style.maxHeight = '';
        if (body && body.style) body.style.paddingBottom = '';
    }

    function getTargetRect(target, config = {}) {
        return config.includeDropdown
            ? getDropdownVisibleRect(target)
            : target.getBoundingClientRect();
    }

    function revealElement(target, options = {}, config = {}) {
        if (!target || typeof target.getBoundingClientRect !== 'function') return;
        if (config.requireOpenDropdown && target.classList && !target.classList.contains('open')) return;

        const { body } = getModalParts(options);
        const extraBodySpace = config.extraBodySpace != null
            ? config.extraBodySpace
            : config.includeDropdown
                ? getDropdownExtraSpace(target)
                : 0;

        updateViewportLayout(options, { extraBodySpace });

        const bodyRect = body && typeof body.getBoundingClientRect === 'function'
            ? body.getBoundingClientRect()
            : null;
        const rect = getTargetRect(target, config);

        if (!body || !bodyRect || !Number.isFinite(body.scrollTop)) return;

        const bodyBottom = bodyRect.bottom - DROPDOWN_BOTTOM_GAP;
        const bodyTop = bodyRect.top + DROPDOWN_TOP_GAP;
        const bodyDelta = getOverflow(rect, bodyTop, bodyBottom);

        if (bodyDelta) {
            scrollElementBy(body, bodyDelta);
        }
    }

    function revealDropdown(dropdown, options = {}) {
        revealElement(dropdown, options, {
            includeDropdown: true,
            requireOpenDropdown: true
        });
    }

    function revealPlainField(field, options = {}) {
        revealElement(field, options);
    }

    function scheduleReveal(target, options = {}, config = {}) {
        const defer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : callback => callback());

        [0, 120, 280, 460].forEach(delay => {
            defer(() => revealElement(target, options, config), delay);
        });
    }

    function scheduleDropdownReveal(options = {}) {
        const dropdown = getOpenDropdown(options);
        if (!dropdown) return;

        revealDropdown(dropdown, options);

        scheduleReveal(dropdown, options, {
            includeDropdown: true,
            requireOpenDropdown: true
        });
    }

    function schedulePlainFieldReveal(field, options = {}) {
        if (!field) return;
        scheduleReveal(field, options);
    }

    function bindPlainFieldReveal(options = {}) {
        const doc = getDocument(options);

        PLAIN_FIELD_IDS.forEach(id => {
            const field = doc.getElementById(id);
            if (!field || typeof field.addEventListener !== 'function') return;

            const reveal = () => {
                if (typeof options.setLastViewportHeight === 'function') {
                    options.setLastViewportHeight(getViewportHeight(options));
                }
                schedulePlainFieldReveal(field, options);
            };

            field.addEventListener('focus', reveal);
            field.addEventListener('click', reveal);
            field.addEventListener('input', () => schedulePlainFieldReveal(field, options));
        });
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
                updateViewportLayout(options);
                const active = getActivePlainField(options);
                if (shouldBlurForViewportChange(active, delta)) blur(active);
                const dropdown = getOpenDropdown(options);
                if (dropdown) {
                    scheduleDropdownReveal(options);
                } else if (active) {
                    revealPlainField(active, options);
                }
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

        clearViewportLayout(options);
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
        getKeyboardInset,
        getOpenDropdown,
        getActivePlainField,
        updateViewportLayout,
        clearViewportLayout,
        revealDropdown,
        revealPlainField,
        bindPlainFieldReveal,
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
