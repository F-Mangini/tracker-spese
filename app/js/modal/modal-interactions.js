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

    function getWindow(options = {}) {
        if (options.window) return options.window;
        if (typeof window !== 'undefined') return window;
        return null;
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

    function getDropdownVisibleRect(container) {
        const containerRect = container.getBoundingClientRect();
        const list = typeof container.querySelector === 'function'
            ? container.querySelector('.sd-list')
            : null;
        const isOpen = container.classList && container.classList.contains('open');

        if (!isOpen || !list || typeof list.getBoundingClientRect !== 'function') {
            return containerRect;
        }

        const listRect = list.getBoundingClientRect();

        return {
            top: Math.min(containerRect.top, listRect.top),
            bottom: Math.max(containerRect.bottom, listRect.bottom)
        };
    }

    function centerDropdown(container) {
        if (container && container.classList && !container.classList.contains('open')) return;
        if (container && typeof container.scrollIntoView === 'function') {
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function revealDropdown(container, options = {}) {
        if (!container || typeof container.getBoundingClientRect !== 'function') return;

        const modalBody = typeof container.closest === 'function'
            ? container.closest('.modal-body')
            : null;
        const win = getWindow(options);
        const doc = getDocument(options);
        const viewportHeight = win && win.visualViewport && Number.isFinite(win.visualViewport.height)
            ? win.visualViewport.height
            : win && Number.isFinite(win.innerHeight)
                ? win.innerHeight
                : doc && doc.documentElement
                    ? doc.documentElement.clientHeight
                    : 0;
        const rect = getDropdownVisibleRect(container);
        const bodyRect = modalBody && typeof modalBody.getBoundingClientRect === 'function'
            ? modalBody.getBoundingClientRect()
            : null;
        const margin = 14;

        if (!viewportHeight) {
            centerDropdown(container);
            return;
        }

        const visibleBottom = bodyRect
            ? Math.min(viewportHeight - margin, bodyRect.bottom - margin)
            : viewportHeight - margin;
        const visibleTop = bodyRect
            ? Math.max(margin, bodyRect.top + margin)
            : margin;
        const overflowBottom = rect.bottom - visibleBottom;
        const overflowTop = visibleTop - rect.top;

        if (modalBody && Number.isFinite(modalBody.scrollTop)) {
            if (overflowBottom > 0) modalBody.scrollTop += overflowBottom;
            else if (overflowTop > 0) modalBody.scrollTop -= overflowTop;
            return;
        }

        if ((overflowBottom > 0 || overflowTop > 0) && typeof container.scrollIntoView === 'function') {
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function scheduleDropdownReveal(container, options = {}, config = {}) {
        const defer = getDefer(options);
        [0, 120, 280, 460].forEach(delay => {
            defer(() => revealDropdown(container, options), delay);
        });

        if (config.centerFallback) {
            defer(() => centerDropdown(container), 300);
        }
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
            scheduleDropdownReveal(container, options);
        };

        input.addEventListener('mousedown', e => {
            if (!container.classList.contains('open')) {
                e.preventDefault();
                input.focus();
                open();
            } else if (!isEditable) {
                e.preventDefault();
                isEditable = true;
                input.readOnly = false;
                input.value = '';
                input.focus();

                scheduleDropdownReveal(container, options, { centerFallback: true });
            }
        });

        input.addEventListener('focus', () => {
            if (!container.classList.contains('open')) {
                open();
            } else {
                scheduleDropdownReveal(container, options);
            }
        });

        input.addEventListener('input', () => {
            if (!container.classList.contains('open')) {
                open();
            }
            renderList(input.value);
            scheduleDropdownReveal(container, options);
        });

        input.addEventListener('blur', () => {
            close();
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
        if (typeof document === 'undefined') return null;

        const container = options.container || document.getElementById(options.containerId || 'sd-tags');
        const chipsEl = options.chipsEl || document.getElementById(options.chipsId || 'tag-chips');
        if (!container || !chipsEl) return null;

        container.innerHTML = ModalView.renderTagInputShell();

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let isEditable = false;

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
            scheduleDropdownReveal(container, options);
        };

        const close = () => {
            const wasOpen = container.classList.contains('open');

            container.classList.remove('open');
            input.readOnly = true;
            isEditable = false;
            input.value = '';

            releaseInteractionAfterClose(options, wasOpen);
        };

        input.addEventListener('mousedown', e => {
            const availableCount = ModalView.getAvailableTagCount(getAllTags(), getCurrentTags());

            if (!container.classList.contains('open')) {
                e.preventDefault();

                if (availableCount === 0) {
                    isEditable = true;
                    input.readOnly = false;
                    input.value = '';
                }

                input.focus();
                open();
            } else if (!isEditable) {
                e.preventDefault();
                isEditable = true;
                input.readOnly = false;
                input.value = '';
                input.focus();
                scheduleDropdownReveal(container, options, { centerFallback: true });
            }
        });

        input.addEventListener('focus', () => {
            if (!container.classList.contains('open')) open();
            else scheduleDropdownReveal(container, options);
        });

        input.addEventListener('input', () => {
            renderList(input.value);
            scheduleDropdownReveal(container, options);
        });
        input.addEventListener('blur', () => close());

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
