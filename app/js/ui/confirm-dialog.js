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
                    choice.onClick();
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
