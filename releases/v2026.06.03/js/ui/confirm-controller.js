/* ============================================
   CONFIRM CONTROLLER - dialog conferme + history
   ============================================ */

const ConfirmController = (() => {
    function call(fn, ...args) {
        if (typeof fn === 'function') return fn(...args);
        return undefined;
    }

    function getDialog(options) {
        return options.dialog || (typeof ConfirmDialog !== 'undefined' ? ConfirmDialog : null);
    }

    function getStack(options) {
        return options.stack || (typeof UIStack !== 'undefined' ? UIStack : null);
    }

    function isOpen(options = {}) {
        const dialog = getDialog(options);
        if (!dialog || typeof dialog.isOpen !== 'function') return false;
        return dialog.isOpen(options.document);
    }

    function close(options = {}) {
        const dialog = getDialog(options);
        if (!dialog || typeof dialog.close !== 'function') return false;

        dialog.close({
            document: options.document,
            fromPopstate: !!options.fromPopstate,
            closeHistory: wasClosedFromPopstate => {
                const stack = getStack(options);
                if (!stack || typeof stack.getCloseHistoryAction !== 'function') return;

                call(options.runHistoryAction, stack.getCloseHistoryAction({
                    fromPopstate: wasClosedFromPopstate,
                    wasOpen: true
                }));
            }
        });

        return true;
    }

    function showChoices(options = {}) {
        const dialog = getDialog(options);
        if (!dialog || typeof dialog.showChoices !== 'function') return false;

        dialog.showChoices({
            document: options.document,
            message: options.message,
            choices: options.choices,
            pushState: state => call(options.pushUiState, state),
            close: fromPopstate => close({
                ...options,
                fromPopstate
            })
        });

        return true;
    }

    function showConfirm(options = {}) {
        const dialog = getDialog(options);
        if (!dialog || typeof dialog.showConfirm !== 'function') return false;

        dialog.showConfirm({
            document: options.document,
            message: options.message,
            onYes: options.onYes,
            yesText: options.yesText,
            noText: options.noText,
            yesClass: options.yesClass,
            checkbox: options.checkbox,
            pushState: state => call(options.pushUiState, state),
            close: fromPopstate => close({
                ...options,
                fromPopstate
            })
        });

        return true;
    }

    return {
        isOpen,
        showChoices,
        showConfirm,
        close
    };
})();
