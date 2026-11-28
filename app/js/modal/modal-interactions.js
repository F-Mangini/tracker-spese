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

    function getWindow(options = {}) {
        if (options.window) return options.window;
        if (typeof window !== 'undefined') return window;
        return null;
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
    const TOUCH_CLICK_GUARD_MS = 500;
    const dropdownClosers = new WeakMap();
    const dropdownDisposers = new WeakMap();

    function closeDropdown(container) {
        const close = container && dropdownClosers.get(container);
        if (typeof close === 'function') {
            close();
        } else if (container && container.classList) {
            container.classList.remove('open');
        }
    }

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
     * Gestisce readonly -> edit sui dropdown ricercabili e tag:
     * su Apple touch lascia il 2° tap (e il 1° se Tag e vuoto) completamente nativo
     * su <textarea> sbloccata e senza focus preventivo cosi iOS WebKit apre la tastiera.
     */
    function bindDropdownFieldInteractions({
        container,
        chipsEl = null,
        input,
        activeDocument,
        options,
        onOpen,
        onResetValue,
        shouldEditOnOpen = () => false
    }) {
        const previousDispose = dropdownDisposers.get(container);
        if (typeof previousDispose === 'function') {
            previousDispose();
            dropdownDisposers.delete(container);
        }

        const isAppleTouch = isAppleTouchDevice(options);
        let isEditable = false;
        let ignoreNextBlurClose = false;
        let handledMouseDown = false;
        let suppressNextFocusOpen = false;
        let internalBlurToken = 0;
        let unlockToken = 0;
        let touchState = null;
        let outsideTouch = null;
        let lastDocTouchTime = 0;

        const isOpen = () => container.classList.contains('open');

        const syncClosedReadOnly = () => {
            if (isOpen() || isEditable) return;
            setReadOnlyState(input, isAppleTouch ? !shouldEditOnOpen() : true);
        };

        const resetEditable = () => {
            unlockToken += 1;
            isEditable = false;
            touchState = null;
            outsideTouch = null;
            syncClosedReadOnly();
        };

        const close = () => {
            const wasOpen = isOpen();

            container.classList.remove('open');
            resetEditable();
            call(onResetValue);

            releaseInteractionAfterClose(options, wasOpen);
        };

        dropdownClosers.set(container, close);

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
            if (activeDocument && activeDocument.activeElement === input && typeof input.blur === 'function') {
                input.blur();
            }
            isEditable = true;
            setReadOnlyState(input, false);
            input.value = '';
            focusWithoutOpening();
        };

        const scheduleAppleUnlock = () => {
            const defer = getDefer(options);
            const token = ++unlockToken;
            defer(() => {
                if (token !== unlockToken || !isOpen() || isEditable) return;
                if (activeDocument && activeDocument.activeElement === input && typeof input.blur === 'function') {
                    ignoreInternalBlurOnce();
                    input.blur();
                }
                setReadOnlyState(input, false);
            }, 0);
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

        const containsTarget = (node, target) => {
            if (!node || !target) return false;
            if (node === target) return true;
            return typeof node.contains === 'function' && node.contains(target);
        };

        const isInsideDropdown = target =>
            containsTarget(container, target) || containsTarget(chipsEl, target);

        syncClosedReadOnly();

        if (isAppleTouch) {
            input.addEventListener('touchstart', () => {
                if (!isOpen() && shouldEditOnOpen() && input.readOnly) {
                    setReadOnlyState(input, false);
                } else if (isOpen() && !isEditable && input.readOnly) {
                    setReadOnlyState(input, false);
                }
            }, { passive: true });

            input.addEventListener('mousedown', e => {
                ignoreInternalBlurOnce();

                if (!isOpen()) {
                    if (shouldEditOnOpen()) {
                        if (input.readOnly) setReadOnlyState(input, false);
                    } else {
                        if (e && typeof e.preventDefault === 'function') e.preventDefault();
                        call(onOpen);
                        scheduleAppleUnlock();
                    }
                    return;
                }

                if (!isEditable && input.readOnly) {
                    setReadOnlyState(input, false);
                }
            });

            input.addEventListener('click', () => {
                if (handledMouseDown) {
                    handledMouseDown = false;
                }
            });

            input.addEventListener('focus', () => {
                if (input.readOnly) return;
                if (!isOpen()) {
                    call(onOpen);
                }
                if (!isEditable) {
                    isEditable = true;
                    input.value = '';
                }
            });

            input.addEventListener('blur', closeAfterBlur);

            if (activeDocument && typeof activeDocument.addEventListener === 'function') {
                const onDocTouchStart = e => {
                    lastDocTouchTime = Date.now();
                    const touch = e && e.touches && e.touches[0];
                    if (!touch || !isOpen() || isInsideDropdown(e.target)) {
                        outsideTouch = null;
                        return;
                    }
                    outsideTouch = {
                        x: touch.clientX,
                        y: touch.clientY,
                        moved: false
                    };
                };

                const onDocTouchMove = e => {
                    if (!outsideTouch || outsideTouch.moved) return;
                    const touch = e && e.touches && e.touches[0];
                    if (!touch) return;
                    if (Math.hypot(touch.clientX - outsideTouch.x, touch.clientY - outsideTouch.y) > TAP_MOVE_LIMIT) {
                        outsideTouch.moved = true;
                    }
                };

                const onDocTouchCancel = () => {
                    outsideTouch = null;
                };

                const onDocTouchEnd = () => {
                    lastDocTouchTime = Date.now();
                    if (!outsideTouch) return;
                    const state = outsideTouch;
                    outsideTouch = null;
                    if (state.moved || !isOpen()) return;

                    if (activeDocument.activeElement === input && typeof input.blur === 'function') {
                        input.blur();
                    } else {
                        close();
                    }
                };

                const onDocMouseDown = e => {
                    if (!isOpen() || isEditable || isInsideDropdown(e && e.target)) return;
                    if (Date.now() - lastDocTouchTime < TOUCH_CLICK_GUARD_MS) return;
                    close();
                };

                activeDocument.addEventListener('touchstart', onDocTouchStart, { capture: true, passive: true });
                activeDocument.addEventListener('touchmove', onDocTouchMove, { capture: true, passive: true });
                activeDocument.addEventListener('touchcancel', onDocTouchCancel, { capture: true, passive: true });
                activeDocument.addEventListener('touchend', onDocTouchEnd, { capture: true, passive: true });
                activeDocument.addEventListener('mousedown', onDocMouseDown, { capture: true, passive: true });

                dropdownDisposers.set(container, () => {
                    if (typeof activeDocument.removeEventListener !== 'function') return;
                    activeDocument.removeEventListener('touchstart', onDocTouchStart, { capture: true });
                    activeDocument.removeEventListener('touchmove', onDocTouchMove, { capture: true });
                    activeDocument.removeEventListener('touchcancel', onDocTouchCancel, { capture: true });
                    activeDocument.removeEventListener('touchend', onDocTouchEnd, { capture: true });
                    activeDocument.removeEventListener('mousedown', onDocMouseDown, { capture: true });
                });
            }

            return {
                close,
                isEditable: () => isEditable,
                syncReadOnly: syncClosedReadOnly
            };
        }

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
            isEditable: () => isEditable,
            syncReadOnly: syncClosedReadOnly
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
                    if (fieldInteractions && typeof fieldInteractions.syncReadOnly === 'function') {
                        fieldInteractions.syncReadOnly();
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
            if (fieldInteractions && typeof fieldInteractions.syncReadOnly === 'function') {
                fieldInteractions.syncReadOnly();
            }
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
            chipsEl,
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
        closeDropdown,
        createSearchableDropdown,
        createTagInput
    };
})();
