/* ============================================
   MODAL VIEW - rendering e logica pura modale
   ============================================ */

const ModalView = (() => {
    function formatDropdownItem(item = {}) {
        return `${item.emoji || ''} ${item.nome || ''}`.trim();
    }

    function renderDropdownShell(selected = {}) {
        return `
            <textarea rows="1" class="sd-input" autocomplete="nope" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" enterkeyhint="done" readonly data-value="${AppUI.escapeHtml(selected.id || '')}">${AppUI.escapeHtml(formatDropdownItem(selected))}</textarea>
            <span class="sd-arrow">\u25bc</span>
            <div class="sd-list"></div>
        `;
    }

    function getDropdownItems(items, filter = '') {
        const list = Array.isArray(items) ? items : [];
        const query = String(filter || '').toLowerCase();

        let filtered = query
            ? list.filter(item => {
                const name = String(item.nome || '').toLowerCase();
                const fullLabel = `${item.emoji || ''} ${item.nome || ''}`.toLowerCase();
                return name.includes(query) || fullLabel.includes(query);
            })
            : list;

        if (query && filtered.length > 0) {
            filtered = [...filtered].sort((a, b) => {
                const nameA = String(a.nome || '').toLowerCase();
                const nameB = String(b.nome || '').toLowerCase();
                const indexA = nameA.indexOf(query);
                const indexB = nameB.indexOf(query);

                if (indexA !== indexB) {
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                }

                return nameA.localeCompare(nameB, 'it');
            });
        }

        return filtered;
    }

    function renderDropdownEmpty() {
        return '<div class="sd-empty">Nessun risultato</div>';
    }

    function renderDropdownList(items, selectedId) {
        return (Array.isArray(items) ? items : []).map((item, index) =>
            `<div class="sd-item${item.id === selectedId ? ' selected' : ''}" data-id="${AppUI.escapeHtml(item.id)}" data-idx="${index}">${AppUI.escapeHtml(formatDropdownItem(item))}</div>`
        ).join('');
    }

    function renderTagInputShell() {
        return `
            <textarea rows="1" class="sd-input" placeholder="Aggiungi tag..." autocomplete="nope" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" enterkeyhint="done" readonly></textarea>
            <div class="sd-list"></div>
        `;
    }

    function getAllTags(spese) {
        const tagSet = new Set();

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            if (!Array.isArray(spesa.tags)) return;
            spesa.tags.forEach(tag => {
                if (tag) tagSet.add(tag);
            });
        });

        return [...tagSet].sort();
    }

    function getTagStats(spese) {
        const freq = {};
        const lastUsed = {};

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            if (!Array.isArray(spesa.tags)) return;

            const timestamp = new Date(spesa.data).getTime();
            spesa.tags.forEach(tag => {
                freq[tag] = (freq[tag] || 0) + 1;
                if (!lastUsed[tag] || timestamp > lastUsed[tag]) {
                    lastUsed[tag] = timestamp;
                }
            });
        });

        return { freq, lastUsed };
    }

    function normalizeTagQuery(filter = '') {
        return String(filter || '').toLowerCase().replace(/^#/, '');
    }

    function cleanTagInput(value = '') {
        return normalizeTagQuery(value).replace(/\s+/g, '');
    }

    function getAvailableTags(allTags, currentTags, filter = '') {
        const selected = Array.isArray(currentTags) ? currentTags : [];
        const query = normalizeTagQuery(filter);

        return (Array.isArray(allTags) ? allTags : []).filter(tag =>
            !selected.includes(tag) && (query ? tag.toLowerCase().includes(query) : true)
        );
    }

    function getTagSuggestions(options = {}) {
        const allTags = Array.isArray(options.allTags) ? options.allTags : [];
        const currentTags = Array.isArray(options.currentTags) ? options.currentTags : [];
        const stats = options.stats || {};
        const freq = stats.freq || {};
        const lastUsed = stats.lastUsed || {};
        const query = normalizeTagQuery(options.filter);
        const available = getAvailableTags(allTags, currentTags, options.filter);

        if (available.length === 0) return [];

        if (!query) {
            const sorted = available.slice().sort((a, b) => (lastUsed[b] || 0) - (lastUsed[a] || 0));
            const mostRecent = sorted[0];
            const ordered = [{ tag: mostRecent, icon: '\uD83D\uDD50' }];

            const byFrequency = available.slice().sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
            for (const tag of byFrequency) {
                if (tag !== mostRecent && ordered.length < 3) {
                    ordered.push({ tag, icon: '\u2b50' });
                }
            }

            const usedTags = new Set(ordered.map(item => item.tag));
            for (const tag of sorted) {
                if (!usedTags.has(tag)) {
                    ordered.push({ tag, icon: '' });
                }
            }

            return ordered;
        }

        return available
            .slice()
            .sort((a, b) => {
                const nameA = a.toLowerCase();
                const nameB = b.toLowerCase();
                const indexA = nameA.indexOf(query);
                const indexB = nameB.indexOf(query);

                if (indexA !== indexB) {
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                }

                return nameA.localeCompare(nameB, 'it');
            })
            .map(tag => ({ tag, icon: '' }));
    }

    function renderTagChips(tags) {
        return (Array.isArray(tags) ? tags : []).map(tag =>
            `<span class="tag-chip">#${AppUI.escapeHtml(tag)}<button class="tag-remove" data-tag="${AppUI.escapeHtml(tag)}">\u00d7</button></span>`
        ).join('');
    }

    function renderTagList(options = {}) {
        const allTags = Array.isArray(options.allTags) ? options.allTags : [];
        const currentTags = Array.isArray(options.currentTags) ? options.currentTags : [];
        const suggestions = getTagSuggestions(options);
        const cleanTag = cleanTagInput(options.filter);

        let html = suggestions.map(({ tag, icon }) =>
            `<div class="sd-item" data-tag="${AppUI.escapeHtml(tag)}"><span>#${AppUI.escapeHtml(tag)}</span>${icon ? `<span class="tag-hint-icon">${AppUI.escapeHtml(icon)}</span>` : ''}</div>`
        ).join('');

        if (cleanTag && !allTags.includes(cleanTag) && !currentTags.includes(cleanTag)) {
            html += `<div class="sd-item create-new" data-tag="${AppUI.escapeHtml(cleanTag)}">+ Crea "#${AppUI.escapeHtml(cleanTag)}"</div>`;
        }

        return html || '<div class="sd-empty">Nessun tag</div>';
    }

    function getAvailableTagCount(allTags, currentTags) {
        return getAvailableTags(allTags, currentTags).length;
    }

    return {
        formatDropdownItem,
        renderDropdownShell,
        getDropdownItems,
        renderDropdownEmpty,
        renderDropdownList,
        renderTagInputShell,
        getAllTags,
        getTagStats,
        normalizeTagQuery,
        cleanTagInput,
        getAvailableTags,
        getTagSuggestions,
        renderTagChips,
        renderTagList,
        getAvailableTagCount
    };
})();
