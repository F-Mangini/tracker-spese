/* ============================================
   UI UTILS - formattazione e helper piccoli
   ============================================ */

const AppUI = (() => {
    function money(value) {
        const amount = Number(value || 0);
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        if (Math.abs(safeAmount) >= 100) {
            return `\u20ac${Math.round(safeAmount)}`;
        }

        const roundedCents = Math.round(safeAmount * 100) / 100;
        if (Number.isInteger(roundedCents)) {
            return `\u20ac${roundedCents}`;
        }

        return `\u20ac${roundedCents.toFixed(2)}`;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getCategory(id, categories) {
        const list = Array.isArray(categories) ? categories : [];
        return list.find(category => category.id === id) || list[list.length - 1] || {};
    }

    function getMethod(id, methods) {
        const list = Array.isArray(methods) ? methods : [];
        return list.find(method => method.id === id) || list[0] || {};
    }

    function formatDayLabel(dateKey, options = {}) {
        const now = options.now ? new Date(options.now) : new Date();
        const today = StatsData.dateKey(now);
        const yesterday = StatsData.dateKey(new Date(now.getTime() - 86400000));

        if (dateKey === today) return '\uD83D\uDCCC Oggi';
        if (dateKey === yesterday) return 'Ieri';

        return new Date(`${dateKey}T12:00:00`).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }

    function toInputDate(date) {
        const d = new Date(date);
        return (
            d.getFullYear() +
            '-' +
            String(d.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(d.getDate()).padStart(2, '0')
        );
    }

    function toInputTime(date) {
        const d = new Date(date);
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }

    function dateStamp(date = new Date()) {
        return StatsData.dateKey(date);
    }

    function parseAmountInput(value) {
        let text = String(value || '').trim();
        text = text.replace(/\s/g, '').replace(/\u20ac/g, '').replace(/euro/gi, '');

        const lastComma = text.lastIndexOf(',');
        const lastDot = text.lastIndexOf('.');

        if (lastComma !== -1 && lastDot !== -1) {
            if (lastComma > lastDot) {
                text = text.replace(/\./g, '').replace(',', '.');
            } else {
                text = text.replace(/,/g, '');
            }
        } else if (lastComma !== -1) {
            text = text.replace(',', '.');
        }

        const amount = Number(text);
        return Number.isFinite(amount) ? amount : NaN;
    }

    return {
        money,
        escapeHtml,
        getCategory,
        getMethod,
        formatDayLabel,
        toInputDate,
        toInputTime,
        dateStamp,
        parseAmountInput
    };
})();
