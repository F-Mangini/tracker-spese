/* ============================================
   MODAL INTERACTIONS - eventi dropdown/tag modale
   ============================================ */

const ModalInteractions = (() => {
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

        if (typeof document === 'undefined') return false;

        const modalSelector = options.modalSelector || DEFAULT_MODAL_SELECTOR;
        return !!document.querySelector(`${modalSelector} .searchable-dropdown.open`);
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

        setTimeout(() => {
            if (!hasOpenDropdown(options) && isInteractionActive(options)) {
                call(options.releaseInteractionState);
            }
        }, 10);
    }

    function createSearchableDropdown(options = {}) {
        if (typeof document === 'undefined') return null;

        const activeDocument = getDocument(options);
        const container = options.container || document.getElementById(options.containerId);
        const items = Array.isArray(options.items) ? options.items : [];
        if (!container) return null;

        const currentValue = options.currentValue;
        const selected = items.find(item => item.id === currentValue) || items[0] || {};

        container.innerHTML = ModalView.renderDropdownShell(selected);

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let highlightIdx = -1;
        let isEditable = false;
        let ignoreNextBlurClose = false;
        let handledMouseDown = false;
        let suppressNextFocusOpen = false;

        const findItem = id => items.find(item => item.id === id);
        const getSelectedItem = () => findItem(input.dataset.value) || items[0] || {};

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

        const close = () => {
            const wasOpen = container.classList.contains('open');

            container.classList.remove('open');
            input.readOnly = true;
            isEditable = false;

            const selectedItem = getSelectedItem();
            input.value = ModalView.formatDropdownItem(selectedItem);

            releaseInteractionAfterClose(options, wasOpen);
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

        const ignoreInternalBlurOnce = () => {
            const defer = getDefer(options);
            ignoreNextBlurClose = true;
            handledMouseDown = true;
            defer(() => {
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

        input.addEventListener('mousedown', e => {
            ignoreInternalBlurOnce();

            if (!container.classList.contains('open')) {
                e.preventDefault();
                focusWithoutOpening();
                open();
            } else if (!isEditable) {
                e.preventDefault();
                isEditable = true;
                input.readOnly = false;
                input.value = '';
                focusWithoutOpening();
            } else {
                suppressFocusOpenOnce();
            }
        });

        input.addEventListener('click', e => {
            if (handledMouseDown) {
                handledMouseDown = false;
            }
        });

        input.addEventListener('focus', () => {
            if (suppressNextFocusOpen) {
                suppressNextFocusOpen = false;
                return;
            }

            if (!container.classList.contains('open')) {
                open();
            }
        });

        input.addEventListener('input', () => {
            if (!container.classList.contains('open')) {
                open();
            }
            renderList(input.value);
        });

        input.addEventListener('blur', closeAfterBlur);

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
        if (typeof document === 'undefined') return null;

        const activeDocument = getDocument(options);
        const container = options.container || document.getElementById(options.containerId || 'sd-tags');
        const chipsEl = options.chipsEl || document.getElementById(options.chipsId || 'tag-chips');
        if (!container || !chipsEl) return null;

        container.innerHTML = ModalView.renderTagInputShell();

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let isEditable = false;
        let ignoreNextBlurClose = false;
        let handledMouseDown = false;
        let suppressNextFocusOpen = false;

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

                    if (isEditable) {
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

        const close = () => {
            const wasOpen = container.classList.contains('open');

            container.classList.remove('open');
            input.readOnly = true;
            isEditable = false;
            input.value = '';

            releaseInteractionAfterClose(options, wasOpen);
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

        const ignoreInternalBlurOnce = () => {
            const defer = getDefer(options);
            ignoreNextBlurClose = true;
            handledMouseDown = true;
            defer(() => {
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

        input.addEventListener('mousedown', e => {
            ignoreInternalBlurOnce();

            const availableCount = ModalView.getAvailableTagCount(getAllTags(), getCurrentTags());

            if (!container.classList.contains('open')) {
                e.preventDefault();

                if (availableCount === 0) {
                    isEditable = true;
                    input.readOnly = false;
                    input.value = '';
                }

                focusWithoutOpening();
                open();
            } else if (!isEditable) {
                e.preventDefault();
                isEditable = true;
                input.readOnly = false;
                input.value = '';
                focusWithoutOpening();
            } else {
                suppressFocusOpenOnce();
            }
        });

        input.addEventListener('click', e => {
            if (handledMouseDown) {
                handledMouseDown = false;
            }
        });

        input.addEventListener('focus', () => {
            if (suppressNextFocusOpen) {
                suppressNextFocusOpen = false;
                return;
            }

            if (!container.classList.contains('open')) open();
        });

        input.addEventListener('input', () => {
            renderList(input.value);
        });
        input.addEventListener('blur', closeAfterBlur);

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
