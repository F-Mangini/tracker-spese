/* ============================================
   MODAL FORM CONTROLLER - campi form modifica
   ============================================ */

const ModalFormController = (() => {
    const PICKER_FIELD_IDS = ['edit-data', 'edit-ora'];
    const PLAIN_FIELD_IDS = ['edit-importo', 'edit-descrizione', 'edit-nota'];

    function getElement(doc, id) {
        if (!doc || typeof doc.getElementById !== 'function') return null;
        return doc.getElementById(id);
    }

    function fillForm(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const spesa = options.spesa;
        if (!activeDocument || !spesa) return;

        const date = new Date(spesa.data);
        const toInputDate = typeof options.toInputDate === 'function'
            ? options.toInputDate
            : value => value.toISOString().slice(0, 10);
        const toInputTime = typeof options.toInputTime === 'function'
            ? options.toInputTime
            : value => value.toTimeString().slice(0, 5);

        const fields = {
            'edit-importo': spesa.importo,
            'edit-descrizione': spesa.descrizione,
            'edit-data': toInputDate(date),
            'edit-ora': toInputTime(date),
            'edit-nota': spesa.nota || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const el = getElement(activeDocument, id);
            if (el) el.value = value;
        });
    }

    function readForm(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const parseAmountInput = options.parseAmountInput;
        if (!activeDocument || typeof parseAmountInput !== 'function') {
            return { success: false, error: 'Form non disponibile' };
        }

        const amountEl = getElement(activeDocument, 'edit-importo');
        const importo = parseAmountInput(amountEl ? amountEl.value : '');

        if (!importo || importo <= 0) {
            return { success: false, error: 'Importo non valido' };
        }

        const dateEl = getElement(activeDocument, 'edit-data');
        const timeEl = getElement(activeDocument, 'edit-ora');
        const descEl = getElement(activeDocument, 'edit-descrizione');
        const noteEl = getElement(activeDocument, 'edit-nota');
        const getDropdownValue = typeof options.getDropdownValue === 'function'
            ? options.getDropdownValue
            : (_id, fallback) => fallback;
        const getTags = typeof options.getTags === 'function'
            ? options.getTags
            : () => [];

        const dateVal = dateEl ? dateEl.value : '';
        const timeVal = timeEl ? timeEl.value : '';

        return {
            success: true,
            data: {
                importo: Math.round(importo * 100) / 100,
                descrizione: (descEl && descEl.value) || 'Spesa',
                categoria: getDropdownValue('sd-categoria', 'altro'),
                metodo: getDropdownValue('sd-metodo', 'carta'),
                data: new Date(`${dateVal}T${timeVal || '12:00'}:00`).toISOString(),
                nota: noteEl ? noteEl.value : '',
                tags: [...getTags()]
            }
        };
    }

    function bindPickerFields(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const defer = options.defer || (callback => setTimeout(callback, 0));

        PICKER_FIELD_IDS.forEach(id => {
            const el = getElement(activeDocument, id);
            if (!el) return;

            if (typeof options.bindPicker === 'function') {
                options.bindPicker(el);
            }

            el.addEventListener('change', () => {
                el.classList.remove('picker-open');
                defer(() => {
                    if (activeDocument.activeElement === el) {
                        try { el.blur(); } catch (_) { }
                    }
                });
            });

            el.addEventListener('focus', () => {
                if (typeof options.setLastViewportHeight === 'function' &&
                    typeof options.getViewportHeight === 'function') {
                    options.setLastViewportHeight(options.getViewportHeight());
                }
            });
        });
    }

    function bindPlainFieldEnterBlur(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);

        PLAIN_FIELD_IDS.forEach(id => {
            const el = getElement(activeDocument, id);
            if (!el) return;

            el.addEventListener('keydown', e => {
                if (e.key !== 'Enter') return;

                e.preventDefault();
                el.blur();
            });
        });
    }

    function clearPickerVisuals(doc) {
        const activeDocument = doc || (typeof document !== 'undefined' ? document : null);
        PICKER_FIELD_IDS.forEach(id => {
            const el = getElement(activeDocument, id);
            if (el) el.classList.remove('picker-open');
        });
    }

    return {
        fillForm,
        readForm,
        bindPickerFields,
        bindPlainFieldEnterBlur,
        clearPickerVisuals
    };
})();
