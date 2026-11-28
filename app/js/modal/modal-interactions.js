/* ============================================
   MODAL INTERACTIONS - eventi dropdown/tag modale
   ============================================ */

import { ModalView } from './modal-view.js';

export const ModalInteractions = (() => {
    const DEFAULT_MODAL_SELECTOR = '#edit-modal';

    function call(fn, ...args) {
        return typeof fn === 'function' ? fn(...args) : undefined;
    }

    function isInteractionActive(options) {
        return !!call(options.isInteractionActive);
    }

    function isInteractionReleaseSuspended(options) {
        return !!call(options.isInteractionReleaseSuspended);
    }

    function hasOpenDropdown(options) {
        if (typeof options.hasOpenDropdown === 'function') {
            return !!options.hasOpenDropdown();
        }

        const activeDocument = getDocument(options);
        if (!activeDocument || typeof activeDocument.querySelector !== 'function') return false;

        const modalSelector = options.modalSelector || DEFAULT_MODAL_SELECTOR;
        return !!activeDocument.querySelector(`${modalSelector} .searchable-dropdown.open`);
    }

    function getDocument(options = {}) {
        if (options.document) return options.document;
        if (typeof document !== 'undefined') return document;
        return null;
    }

    function getDefer(options = {}) {
        return options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : ((callback) => callback()));
    }

    function ensureInteraction(options, wasClosed) {
        if (wasClosed) call(options.ensureInteractionState);
    }

    function releaseInteractionAfterClose(options, wasOpen) {
        if (!wasOpen || !isInteractionActive(options) || isInteractionReleaseSuspended(options)) return;

        getDefer(options)(() => {
            if (!hasOpenDropdown(options) && isInteractionActive(options)) {
                call(options.releaseInteractionState);
            }
        }, 10);
    }

    const TAP_MOVE_LIMIT = 10;

    function setReadOnlyState(input, readOnly) {
        if (!input) return;
        input.readOnly = Boolean(readOnly);
        if (readOnly) {
            if (typeof input.setAttribute === 'function') input.setAttribute('readonly', '');
        } else if (typeof input.removeAttribute === 'function') {
            input.removeAttribute('readonly');
        }
    }

    /**
     * Gestisce tap readonly -> edit su dropdown ricercabili e tag per sbloccare
     * la tastiera iOS WebKit al secondo tap (o al primo se Tag non ha suggerimenti).
     */
    function bindDropdownFieldInteractions({
        container,
        input,
        activeDocument,
        options,
        onOpen,
        onResetValue,
        shouldEditOnOpen = () => false
    }) {
        let isEditable = false;
        let ignoreNextBlurClose = false;
        let handledMouseDown = false;
        let suppressNextFocusOpen = false;
        let internalBlurToken = 0;
        let touchState = null;

        const isOpen = () => container.classList.contains('open');

        const resetEditable = () => {
            isEditable = false;
            touchState = null;
            setReadOnlyState(input, true);
        };

        const close = () => {
            const wasOpen = isOpen();

            container.classList.remove('open');
            resetEditable();
            call(onResetValue);

            releaseInteractionAfterClose(options, wasOpen);
        };

        const ignoreInternalBlurOnce = () => {
            const defer = getDefer(options);
            const token = ++internalBlurToken;
            ignoreNextBlurClose = true;
            handledMouseDown = true;
            defer(() => {
                if (token !== internalBlurToken) return;
                ignoreNextBlurClose = false;
                handledMouseDown = false;
            }, 0);
        };

        const suppressFocusOpenOnce = () => {
            const defer = getDefer(options);
            suppressNextFocusOpen = true;
            defer(() => {
                suppressNextFocusOpen = false;
            }, 0);
        };

        const focusWithoutOpening = () => {
            suppressFocusOpenOnce();
            input.focus();
        };

        const enableEditing = () => {
            ignoreInternalBlurOnce();
            // Forza blur -> focus con readonly disattivato cosi iOS WebKit avvia l'input session.
            if (activeDocument && activeDocument.activeElement === input && typeof input.blur === 'function') {
                input.blur();
            }
            isEditable = true;
            setReadOnlyState(input, false);
            input.value = '';
            focusWithoutOpening();
        };

        const closeAfterBlur = () => {
            const defer = getDefer(options);
            const ignoreBlur = ignoreNextBlurClose;
            ignoreNextBlurClose = false;
            defer(() => {
                if (ignoreBlur) return;
                if (activeDocument && activeDocument.activeElement === input) return;
                close();
            }, 0);
        };

        const cancelPendingTouchEdit = () => {
            if (!touchState) return;
            const shouldRestoreReadOnly = !isEditable;
            touchState = null;
            if (shouldRestoreReadOnly) setReadOnlyState(input, true);
        };

        input.addEventListener('touchstart', e => {
            const touch = e && e.touches && e.touches[0];
            if (!touch) return;

            const mode = isOpen()
                ? (!isEditable ? 'edit' : '')
                : (shouldEditOnOpen() ? 'open-edit' : '');

            if (!mode) {
                touchState = null;
                return;
            }

            setReadOnlyState(input, false);
            touchState = {
                x: touch.clientX,
                y: touch.clientY,
                moved: false,
                mode
            };
        }, { passive: true });

        input.addEventListener('touchmove', e => {
            if (!touchState || touchState.moved) return;
            const touch = e && e.touches && e.touches[0];
            if (!touch) return;

            if (Math.hypot(touch.clientX - touchState.x, touch.clientY - touchState.y) > TAP_MOVE_LIMIT) {
                touchState.moved = true;
                cancelPendingTouchEdit();
            }
        }, { passive: true });

        input.addEventListener('touchcancel', cancelPendingTouchEdit, { passive: true });

        input.addEventListener('touchend', () => {
            if (!touchState) return;
            const state = touchState;
            touchState = null;
            if (state.moved) {
                if (!isEditable) setReadOnlyState(input, true);
                return;
            }

            if (state.mode === 'open-edit' && !isOpen()) {
                enableEditing();
                call(onOpen);
            } else if (state.mode === 'edit' && isOpen() && !isEditable) {
                enableEditing();
            }
        }, { passive: true });

        input.addEventListener('mousedown', e => {
            ignoreInternalBlurOnce();

            if (!isOpen()) {
                if (shouldEditOnOpen()) {
                    enableEditing();
                } else {
                    if (e && typeof e.preventDefault === 'function') e.preventDefault();
                    focusWithoutOpening();
                }
                call(onOpen);
            } else if (!isEditable) {
                enableEditing();
            } else {
                suppressFocusOpenOnce();
            }
        });

        input.addEventListener('click', () => {
            if (handledMouseDown) {
                handledMouseDown = false;
            }
        });

        input.addEventListener('focus', () => {
            if (suppressNextFocusOpen) {
                suppressNextFocusOpen = false;
                return;
            }

            if (!isOpen()) {
                call(onOpen);
            }
        });

        input.addEventListener('blur', closeAfterBlur);

        return {
            close,
            isEditable: () => isEditable
        };
    }

    function createSearchableDropdown(options = {}) {
        const activeDocument = getDocument(options);
        const container = options.container ||
            (activeDocument && typeof activeDocument.getElementById === 'function'
                ? activeDocument.getElementById(options.containerId)
                : null);
        const items = Array.isArray(options.items) ? options.items : [];
        if (!container) return null;

        const currentValue = options.currentValue;
        const selected = items.find(item => item.id === currentValue) || items[0] || {};

        container.innerHTML = ModalView.renderDropdownShell(selected);

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let highlightIdx = -1;
        let fieldInteractions = null;

        const findItem = id => items.find(item => item.id === id);
        const getSelectedItem = () => findItem(input.dataset.value) || items[0] || {};
        const close = () => {
            if (fieldInteractions) fieldInteractions.close();
        };

        const renderList = (filter = '') => {
            const filtered = ModalView.getDropdownItems(items, filter);

            if (filtered.length === 0) {
                list.innerHTML = ModalView.renderDropdownEmpty();
                highlightIdx = -1;
                return;
            }

            highlightIdx = -1;
            list.innerHTML = ModalView.renderDropdownList(filtered, input.dataset.value);

            list.querySelectorAll('.sd-item').forEach(el => {
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    selectItem(findItem(el.dataset.id));
                });
            });
        };

        const selectItem = (item) => {
            if (!item) return;

            input.value = ModalView.formatDropdownItem(item);
            input.dataset.value = item.id;
            close();
            try { input.blur(); } catch (_) { }
        };

        const open = () => {
            const wasClosed = !container.classList.contains('open');
            container.classList.add('open');

            ensureInteraction(options, wasClosed);
            renderList();
        };

        fieldInteractions = bindDropdownFieldInteractions({
            container,
            input,
            activeDocument,
            options,
            onOpen: open,
            onResetValue: () => {
                const selectedItem = getSelectedItem();
                input.value = ModalView.formatDropdownItem(selectedItem);
            }
        });

        input.addEventListener('input', () => {
            if (!container.classList.contains('open')) {
                open();
            }
            renderList(input.value);
        });

        input.addEventListener('keydown', e => {
            const itemsInList = list.querySelectorAll('.sd-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightIdx = Math.min(highlightIdx + 1, itemsInList.length - 1);
                itemsInList.forEach((el, index) => el.classList.toggle('highlighted', index === highlightIdx));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightIdx = Math.max(highlightIdx - 1, 0);
                itemsInList.forEach((el, index) => el.classList.toggle('highlighted', index === highlightIdx));
            } else if (e.key === 'Enter') {
                e.preventDefault();

                if (highlightIdx >= 0 && highlightIdx < itemsInList.length) {
                    selectItem(findItem(itemsInList[highlightIdx].dataset.id));
                } else if (itemsInList.length > 0) {
                    selectItem(findItem(itemsInList[0].dataset.id));
                }

                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
                input.blur();
            }
        });

        return {
            getValue: () => input.dataset.value,
            setValue: (value) => {
                const item = findItem(value) || items[0] || {};
                input.dataset.value = item.id || '';
                input.value = ModalView.formatDropdownItem(item);
            }
        };
    }

    function createTagInput(options = {}) {
        const activeDocument = getDocument(options);
        const container = options.container ||
            (activeDocument && typeof activeDocument.getElementById === 'function'
                ? activeDocument.getElementById(options.containerId || 'sd-tags')
                : null);
        const chipsEl = options.chipsEl ||
            (activeDocument && typeof activeDocument.getElementById === 'function'
                ? activeDocument.getElementById(options.chipsId || 'tag-chips')
                : null);
        if (!container || !chipsEl) return null;

        container.innerHTML = ModalView.renderTagInputShell();

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let fieldInteractions = null;

        const getCurrentTags = () => {
            const tags = call(options.getTags);
            return Array.isArray(tags) ? tags : [];
        };

        const setCurrentTags = (tags) => {
            call(options.setTags, Array.isArray(tags) ? tags : []);
        };

        const getAllTags = () => {
            const tags = call(options.getAllTags);
            return Array.isArray(tags) ? tags : [];
        };

        const getTagStats = () => call(options.getTagStats) || {};

        const renderChips = () => {
            chipsEl.innerHTML = ModalView.renderTagChips(getCurrentTags());

            chipsEl.querySelectorAll('.tag-remove').forEach(btn => {
                btn.addEventListener('mousedown', e => {
                    e.preventDefault();
                    e.stopPropagation();
                });

                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    setCurrentTags(getCurrentTags().filter(tag => tag !== btn.dataset.tag));
                    renderChips();

                    if (fieldInteractions && fieldInteractions.isEditable()) {
                        input.focus();
                        renderList(input.value);
                    }
                });
            });
        };

        const addTag = (tag) => {
            const cleanTag = String(tag || '').replace(/\s+/g, '');
            const currentTags = getCurrentTags();

            if (!cleanTag || currentTags.includes(cleanTag)) return;

            setCurrentTags([...currentTags, cleanTag]);
            input.value = '';
            renderChips();
            renderList();
        };

        const renderList = (filter = '') => {
            list.innerHTML = ModalView.renderTagList({
                allTags: getAllTags(),
                currentTags: getCurrentTags(),
                filter,
                stats: getTagStats()
            });

            list.querySelectorAll('.sd-item').forEach(el => {
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    addTag(el.dataset.tag);
                });
            });
        };

        const open = () => {
            const wasClosed = !container.classList.contains('open');
            container.classList.add('open');

            ensureInteraction(options, wasClosed);
            renderList();
        };

        fieldInteractions = bindDropdownFieldInteractions({
            container,
            input,
            activeDocument,
            options,
            onOpen: open,
            onResetValue: () => {
                input.value = '';
            },
            shouldEditOnOpen: () => ModalView.getAvailableTagCount(getAllTags(), getCurrentTags()) === 0
        });

        input.addEventListener('input', () => {
            renderList(input.value);
        });

        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;

            e.preventDefault();

            const itemsInList = list.querySelectorAll('.sd-item');
            if (itemsInList.length > 0) {
                const firstTag = itemsInList[0].dataset.tag;
                if (firstTag) addTag(firstTag);
                return;
            }

            const value = ModalView.cleanTagInput(input.value);
            if (value) addTag(value);
        });

        renderChips();

        return {
            renderChips,
            getTags: getCurrentTags
        };
    }

    return {
        createSearchableDropdown,
        createTagInput
    };
})();
