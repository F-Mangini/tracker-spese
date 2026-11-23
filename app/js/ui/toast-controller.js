/* ============================================
   TOAST CONTROLLER - notifiche leggere
   ============================================ */

export const ToastController = (() => {
    let volatileState = {
        timerId: null
    };

    function resetPosition(toast) {
        toast.style.bottom = '';
        toast.style.top = '';
    }

    function show(message, type = 'info', options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const activeWindow = options.window || (typeof window !== 'undefined' ? window : null);
        if (!activeDocument) return null;

        const toast = options.toastElement || activeDocument.getElementById('toast');
        if (!toast) return null;

        const setTimer = options.setTimeout || (typeof setTimeout !== 'undefined' ? setTimeout : null);
        const clearTimer = options.clearTimeout || (typeof clearTimeout !== 'undefined' ? clearTimeout : null);
        const duration = Number.isFinite(options.duration) ? options.duration : 2800;
        const inputActive = typeof options.isExpenseInputActive === 'function'
            ? options.isExpenseInputActive()
            : !!options.expenseInputActive;

        toast.textContent = message;
        toast.className = 'toast ' + type;

        if (inputActive && activeWindow) {
            const inputBar = options.inputBarElement || activeDocument.getElementById('input-bar');
            if (inputBar) {
                const barTop = inputBar.getBoundingClientRect().top;
                toast.style.bottom = (activeWindow.innerHeight - barTop + 8) + 'px';
                toast.style.top = 'auto';
            } else {
                resetPosition(toast);
            }
        } else {
            resetPosition(toast);
        }

        if (volatileState.timerId && clearTimer) clearTimer(volatileState.timerId);

        if (!setTimer) return null;

        volatileState.timerId = setTimer(() => {
            toast.classList.add('hidden');
            resetPosition(toast);
            volatileState.timerId = null;
        }, duration);

        return volatileState.timerId;
    }

    function clear(options = {}) {
        const clearTimer = options.clearTimeout || (typeof clearTimeout !== 'undefined' ? clearTimeout : null);
        if (volatileState.timerId && clearTimer) clearTimer(volatileState.timerId);
        volatileState.timerId = null;
    }

    function getState() {
        return { ...volatileState };
    }

    function resetState(options = {}) {
        clear(options);
    }

    return {
        show,
        clear,
        getState,
        resetState
    };
})();
