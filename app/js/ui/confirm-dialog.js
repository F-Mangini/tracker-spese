/* ============================================
   CONFIRM DIALOG - scelte e conferme riusabili
   ============================================ */

const ConfirmDialog = (() => {
    function getDocument(doc) {
        if (doc) return doc;
        if (typeof document !== 'undefined') return document;
        return null;
    }

    function isOpen(doc) {
        const activeDoc = getDocument(doc);
        const overlay = activeDoc && activeDoc.getElementById
            ? activeDoc.getElementById('confirm-overlay')
            : null;

        return !!overlay && !overlay.classList.contains('hidden');
    }

    function getConfirmChoices(onYes, yesText = null, noText = null, yesClass = 'btn-danger') {
        return [
            { text: noText || 'Annulla', className: 'btn-secondary' },
            { text: yesText || 'Elimina', className: yesClass, onClick: onYes }
        ];
    }

    function removeExtra(activeDoc) {
        const extra = activeDoc && activeDoc.getElementById
            ? activeDoc.getElementById('confirm-extra')
            : null;

        if (extra && extra.parentNode) {
            extra.parentNode.removeChild(extra);
        }
    }

    function renderExtra(activeDoc, options = {}) {
        removeExtra(activeDoc);

        if (!options.checkbox) return null;

        const buttons = activeDoc.querySelector('#confirm-dialog .confirm-buttons');
        const extra = activeDoc.createElement('div');
        const label = activeDoc.createElement('label');
        const checkbox = activeDoc.createElement('input');
        const text = activeDoc.createElement('span');

        extra.id = 'confirm-extra';
        extra.className = 'confirm-extra';
        checkbox.type = 'checkbox';
        checkbox.checked = !!options.checkbox.checked;
        checkbox.dataset.key = options.checkbox.key || 'checked';
        text.textContent = options.checkbox.label || '';

        label.appendChild(checkbox);
        label.appendChild(text);
        extra.appendChild(label);

        buttons.parentNode.insertBefore(extra, buttons);

        return checkbox;
    }

    function showChoices(options = {}) {
        const activeDoc = getDocument(options.document);
        if (!activeDoc) return;

        activeDoc.getElementById('confirm-message').innerHTML = options.message;
        activeDoc.getElementById('confirm-overlay').classList.remove('hidden');

        if (typeof options.pushState === 'function') {
            options.pushState({ panel: 'confirm' });
        }

        const buttons = activeDoc.querySelector('#confirm-dialog .confirm-buttons');
        buttons.innerHTML = '';
        const checkbox = renderExtra(activeDoc, options);

        (options.choices || []).forEach(choice => {
            const btn = activeDoc.createElement('button');
            btn.type = 'button';
            btn.className = `btn ${choice.className || 'btn-secondary'}`;
            btn.textContent = choice.text;
            btn.addEventListener('click', () => {
                if (typeof options.close === 'function') {
                    options.close(false);
                }

                if (typeof choice.onClick === 'function') {
                    const extraState = checkbox
                        ? { [checkbox.dataset.key || 'checked']: checkbox.checked }
                        : {};

                    choice.onClick(extraState);
                }
            });
            buttons.appendChild(btn);
        });
    }

    function showConfirm(options = {}) {
        showChoices({
            ...options,
            choices: getConfirmChoices(
                options.onYes,
                options.yesText,
                options.noText,
                options.yesClass
            )
        });
    }

    function close(options = {}) {
        const activeDoc = getDocument(options.document);
        if (!activeDoc) return;

        activeDoc.getElementById('confirm-overlay').classList.add('hidden');
        removeExtra(activeDoc);

        if (typeof options.closeHistory === 'function') {
            options.closeHistory(!!options.fromPopstate);
        }
    }

    return {
        isOpen,
        getConfirmChoices,
        showChoices,
        showConfirm,
        close
    };
})();
