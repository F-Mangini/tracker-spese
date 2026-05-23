/* ============================================
   EXPENSE SUBMIT CONTROLLER - submit input rapido
   ============================================ */

const ExpenseSubmitController = (() => {
    function call(fn, ...args) {
        if (typeof fn === 'function') return fn(...args);
        return undefined;
    }

    function getDocument(options) {
        return options.document || (typeof document !== 'undefined' ? document : null);
    }

    function getActions(options) {
        return options.actions || (typeof ExpenseActions !== 'undefined' ? ExpenseActions : null);
    }

    function getUi(options) {
        return options.ui || (typeof AppUI !== 'undefined' ? AppUI : null);
    }

    function getInput(options, activeDocument) {
        if (options.input) return options.input;
        if (!activeDocument || typeof activeDocument.getElementById !== 'function') return null;
        return activeDocument.getElementById(options.inputId || 'expense-input');
    }

    function blurElement(element) {
        if (!element || typeof element.blur !== 'function') return;
        try { element.blur(); } catch (_) { }
    }

    function getCategoryForToast(options, spesa) {
        const ui = getUi(options);
        if (!ui || typeof ui.getCategory !== 'function') return { emoji: '' };
        return ui.getCategory(spesa.categoria, options.categories || []) || { emoji: '' };
    }

    function submit(options = {}) {
        const activeDocument = getDocument(options);
        const input = getInput(options, activeDocument);
        const actions = getActions(options);

        if (!input || !actions || typeof actions.addFromText !== 'function') {
            return { success: false, reason: 'unavailable' };
        }

        const result = actions.addFromText({
            text: input.value,
            parser: options.parser,
            storage: options.storage
        }) || {};

        if (result.reason === 'empty') {
            call(options.showToast, 'Scrivi una spesa prima di inviare', 'error');
            return result;
        }

        if (result.reason === 'parse') {
            call(options.showToast, 'Non ho capito l\'importo. Prova: "caff\u00e8 1.50"', 'error');
            return result;
        }

        if (!result.success) {
            call(options.showToast, result.error || 'Salvataggio non riuscito', 'error');
            return result;
        }

        const spesa = result.spesa;
        call(options.setNewCardId, spesa.id);
        input.value = '';
        blurElement(input);
        if (activeDocument) blurElement(activeDocument.activeElement);

        call(options.refreshAfterAdd);

        const category = getCategoryForToast(options, spesa);
        const prefix = category.emoji ? `${category.emoji} ` : '';
        call(
            options.showToast,
            `${prefix}${spesa.descrizione} \u00b7 \u20ac${spesa.importo.toFixed(2)}`,
            'success'
        );

        return result;
    }

    return {
        submit
    };
})();
