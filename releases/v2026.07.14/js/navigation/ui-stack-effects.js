/* ============================================
   UI STACK EFFECTS - cleanup DOM per back/popstate
   ============================================ */

const UIStackEffects = (() => {
    function getDocument(doc) {
        if (doc) return doc;
        if (typeof document !== 'undefined') return document;
        return null;
    }

    function blurById(id, doc) {
        const activeDoc = getDocument(doc);
        const el = activeDoc && activeDoc.getElementById
            ? activeDoc.getElementById(id)
            : null;

        if (el && typeof el.blur === 'function') {
            el.blur();
        }
    }

    function closeFilterSearch(doc) {
        blurById('search-input', doc);
    }

    function closeExpenseInput(doc) {
        const activeDoc = getDocument(doc);

        if (activeDoc && activeDoc.body && activeDoc.body.classList) {
            activeDoc.body.classList.remove('expense-input-active');
        }

        blurById('expense-input', activeDoc);
    }

    function clearModalInteraction(options = {}) {
        const {
            clearSelection,
            setInteractionActive,
            setInteractionReleaseSuspended,
            defer = callback => setTimeout(callback, 0)
        } = options;

        if (typeof setInteractionReleaseSuspended === 'function') {
            setInteractionReleaseSuspended(true);
        }

        if (typeof clearSelection === 'function') {
            clearSelection();
        }

        if (typeof setInteractionActive === 'function') {
            setInteractionActive(false);
        }

        defer(() => {
            if (typeof setInteractionReleaseSuspended === 'function') {
                setInteractionReleaseSuspended(false);
            }
        });
    }

    function clearModalField(options = {}) {
        if (typeof options.clearSelection === 'function') {
            options.clearSelection();
        }

        if (typeof options.pushModalHistoryState === 'function') {
            options.pushModalHistoryState();
        }
    }

    return {
        closeFilterSearch,
        closeExpenseInput,
        clearModalInteraction,
        clearModalField
    };
})();
