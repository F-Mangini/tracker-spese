/* ============================================
   HISTORY CONTROLLER - esecuzione azioni history
   ============================================ */

const HistoryController = (() => {
    function getActionTypes(options) {
        if (options.actionTypes) return options.actionTypes;
        if (options.stack && options.stack.HISTORY_ACTIONS) return options.stack.HISTORY_ACTIONS;
        return UIStack.HISTORY_ACTIONS;
    }

    function getHistory(options) {
        if (options.history) return options.history;
        return history;
    }

    function setSuppressPopstate(options, value) {
        if (typeof options.setSuppressPopstate === 'function') {
            options.setSuppressPopstate(value);
        }
    }

    function run(action, options = {}) {
        const actionTypes = getActionTypes(options);
        if (!action || action.type === actionTypes.NONE) return false;

        const target = getHistory(options);

        if (action.suppressPopstate) {
            setSuppressPopstate(options, true);
        }

        try {
            if (action.type === actionTypes.PUSH) {
                target.pushState(action.state || {}, '');
                return true;
            }

            if (action.type === actionTypes.REPLACE) {
                target.replaceState(action.state || {}, '');
                return true;
            }

            if (action.type === actionTypes.BACK) {
                target.back();
                return true;
            }

            if (action.type === actionTypes.GO) {
                target.go(action.delta || -1);
                return true;
            }
        } catch (_) {
            if (action.type === actionTypes.GO) {
                try {
                    target.back();
                    return true;
                } catch (__) { }
            }
        }

        return false;
    }

    return {
        run
    };
})();
