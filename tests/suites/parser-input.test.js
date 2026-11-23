const {
    assert,
    loadParser,
    loadUiViews,
    expense
} = require('../helpers');

module.exports = function register(test) {
    test('Parser conserva il flusso base di inserimento rapido', () => {
        const Parser = loadParser();
        const result = Parser.parse('caffe 1,50 #colazione contanti');

        assert.equal(result.importo, 1.5);
        assert.equal(result.metodo, 'contanti');
        assert.deepEqual(result.tags, ['colazione']);
        assert.equal(result.categoria, 'bar');
    });

    test('Parser preferisce importi espliciti o finali quando ci sono piu numeri', () => {
        const Parser = loadParser();

        const pizza = Parser.parse('pizza 4 formaggi 8');
        const pizzaEuro = Parser.parse('pizza 4 formaggi 8 euro');
        const caffe = Parser.parse('2 caffe 3 euro');
        const currency = Parser.parse('\u20ac 1,50 caffe');

        assert.equal(pizza.importo, 8);
        assert.equal(pizza.descrizione, 'Pizza 4 formaggi');
        assert.equal(pizzaEuro.importo, 8);
        assert.equal(pizzaEuro.descrizione, 'Pizza 4 formaggi');
        assert.equal(caffe.importo, 3);
        assert.equal(caffe.descrizione, '2 caffe');
        assert.equal(currency.importo, 1.5);
        assert.equal(currency.descrizione, 'Caffe');
    });

    test('Parser non confonde quantita pesate con importi', () => {
        const Parser = loadParser();

        const ciliegie = Parser.parse('10euro 1.5 kg di ciliegie');
        const pere = Parser.parse('5.5 2 kg di pere');

        assert.equal(ciliegie.importo, 10);
        assert.equal(ciliegie.descrizione, '1.5 kg di ciliegie');
        assert.equal(pere.importo, 5.5);
        assert.equal(pere.descrizione, '2 kg di pere');
    });

    test('Parser riconosce keyword categoria solo come parole intere', () => {
        const Parser = loadParser();

        const bus = Parser.parse('bus 2 euro');
        const busta = Parser.parse('busta 2 euro');
        const storeWithSymbol = Parser.parse('h&m 20 euro');

        assert.equal(bus.categoria, 'trasporti');
        assert.equal(busta.categoria, 'altro');
        assert.equal(storeWithSymbol.categoria, 'abbigliamento');
    });

    test('Parser forza la categoria esplicita usando l ultima occorrenza', () => {
        const Parser = loadParser();
        const result = Parser.parse('scarpe 25 .bar .cura-personale');

        assert.equal(result.categoria, 'cura');
        assert.equal(result.descrizione, 'Scarpe');
    });

    test('Azioni spesa isolano parser e storage dall input rapido', () => {
        const { ExpenseActions } = loadUiViews();
        const calls = [];
        const parser = {
            parse(text) {
                calls.push(['parse', text]);
                if (text === '???') return null;
                return { descrizione: 'Caffe', importo: 1.5 };
            }
        };
        const storage = {
            addSpesa(data) {
                calls.push(['add', data.descrizione, data.importo]);
                return {
                    success: true,
                    spesa: expense({ id: 'saved', descrizione: data.descrizione, importo: data.importo })
                };
            },
            updateSpesa(id, data) {
                calls.push(['update', id, data.descrizione]);
                return { success: true, spesa: expense({ id, descrizione: data.descrizione }) };
            },
            deleteSpesa(id) {
                calls.push(['delete', id]);
                return { success: true };
            }
        };

        assert.equal(ExpenseActions.addFromText({ text: '   ', parser, storage }).reason, 'empty');
        assert.equal(ExpenseActions.addFromText({ text: '???', parser, storage }).reason, 'parse');

        const added = ExpenseActions.addFromText({ text: 'caffe 1,50', parser, storage });
        const updated = ExpenseActions.updateExpense({
            id: 'saved',
            data: { descrizione: 'Caffe corretto' },
            storage
        });
        const deleted = ExpenseActions.deleteExpense({ id: 'saved', storage });

        assert.equal(added.success, true);
        assert.equal(added.spesa.id, 'saved');
        assert.equal(updated.success, true);
        assert.equal(deleted.success, true);
        assert.deepEqual(calls, [
            ['parse', '???'],
            ['parse', 'caffe 1,50'],
            ['add', 'Caffe', 1.5],
            ['update', 'saved', 'Caffe corretto'],
            ['delete', 'saved']
        ]);
    });

    test('Controller submit input rapido pulisce input e aggiorna viste dopo salvataggio', () => {
        const { ExpenseSubmitController, AppUI } = loadUiViews();
        const calls = [];
        let newCardId = null;
        const input = {
            value: 'caffe 120.49',
            blurred: false,
            blur() {
                this.blurred = true;
                calls.push('input-blur');
            }
        };
        const activeElement = {
            blur() {
                calls.push('active-blur');
            }
        };
        const doc = {
            activeElement,
            getElementById(id) {
                return id === 'expense-input' ? input : null;
            }
        };
        const savedExpense = expense({
            id: 'new-expense',
            descrizione: 'Caffe',
            importo: 120.49,
            categoria: 'bar'
        });

        const result = ExpenseSubmitController.submit({
            document: doc,
            actions: {
                addFromText(payload) {
                    calls.push(['add', payload.text]);
                    return { success: true, spesa: savedExpense };
                }
            },
            parser: { parse() {} },
            storage: {},
            categories: [{ id: 'bar', emoji: 'B', nome: 'Bar' }],
            ui: {
                getCategory(id, categories) {
                    return categories.find(category => category.id === id);
                },
                money: AppUI.money
            },
            setNewCardId: id => { newCardId = id; },
            refreshAfterAdd: () => calls.push('refresh'),
            showToast: (message, type) => calls.push(['toast', message, type])
        });

        assert.equal(result.success, true);
        assert.equal(input.value, '');
        assert.equal(input.blurred, true);
        assert.equal(newCardId, 'new-expense');
        assert(calls.includes('refresh'));
        assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'add'), ['add', 'caffe 120.49']);
        assert.deepEqual(
            calls.find(call => Array.isArray(call) && call[0] === 'toast'),
            ['toast', 'B Caffe \u00b7 \u20ac120', 'success']
        );
    });

    test('Controller submit input rapido mostra errori senza refresh', () => {
        const { ExpenseSubmitController } = loadUiViews();
        const cases = [
            {
                result: { success: false, reason: 'empty' },
                expected: 'Scrivi una spesa prima di inviare'
            },
            {
                result: { success: false, reason: 'parse' },
                expected: 'Non ho capito l\'importo. Prova: "caff\u00e8 1.50"'
            },
            {
                result: { success: false, reason: 'storage', error: 'Quota piena' },
                expected: 'Quota piena'
            }
        ];

        cases.forEach(({ result, expected }) => {
            const calls = [];
            const input = {
                value: 'test',
                blur() {
                    calls.push('blur');
                }
            };
            const doc = {
                activeElement: input,
                getElementById(id) {
                    return id === 'expense-input' ? input : null;
                }
            };

            const submitResult = ExpenseSubmitController.submit({
                document: doc,
                actions: {
                    addFromText() {
                        return result;
                    }
                },
                refreshAfterAdd: () => calls.push('refresh'),
                showToast: (message, type) => calls.push(['toast', message, type])
            });

            assert.equal(submitResult, result);
            assert.equal(input.value, 'test');
            assert(!calls.includes('refresh'));
            assert(!calls.includes('blur'));
            assert.deepEqual(calls, [['toast', expected, 'error']]);
        });
    });

    test('Controller input rapido collega touch, focus e blur senza dipendere da App', () => {
        const { ExpenseInputController } = loadUiViews();
        const calls = [];
        const timers = [];
        let active = false;
        let submitCount = 0;
        let lastViewportHeight = 0;

        function element(id) {
            const classes = new Set();
            return {
                id,
                value: '',
                style: {},
                listeners: {},
                classList: {
                    add(cls) {
                        classes.add(cls);
                    },
                    remove(cls) {
                        classes.delete(cls);
                    },
                    contains(cls) {
                        return classes.has(cls);
                    }
                },
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                }
            };
        }

        const elements = {
            'expense-input': element('expense-input'),
            'btn-send': element('btn-send'),
            'btn-voice': element('btn-voice'),
            'input-bar': element('input-bar')
        };
        const bodyClasses = new Set();
        const doc = {
            body: {
                classList: {
                    add(cls) {
                        bodyClasses.add(cls);
                    },
                    remove(cls) {
                        bodyClasses.delete(cls);
                    },
                    contains(cls) {
                        return bodyClasses.has(cls);
                    }
                }
            },
            getElementById(id) {
                return elements[id] || null;
            }
        };

        const controller = ExpenseInputController.init({
            document: doc,
            window: {},
            onSubmit: () => { submitCount += 1; },
            isInputActive: () => active,
            setInputActive: value => { active = value; calls.push(['active', value]); },
            getViewportHeight: () => 640,
            setLastViewportHeight: value => { lastViewportHeight = value; },
            pushInputState: () => calls.push('push-input'),
            consumeInputState: () => calls.push('consume-input'),
            startInputBarWatch: () => calls.push('start-watch'),
            stopInputBarWatch: () => calls.push('stop-watch'),
            scheduleInputBarPositionUpdate: force => calls.push(['schedule', force]),
            updateAppMainPadding: () => calls.push('update-padding'),
            setTimeout: (callback, ms) => {
                timers.push({ callback, ms });
                return timers.length;
            },
            clearTimeout: id => calls.push(['clear-timer', id])
        });

        assert.ok(controller);
        assert.equal(elements['btn-voice'].style.display, 'none');

        let touchMovePrevented = false;
        elements['input-bar'].listeners.touchmove({
            preventDefault() {
                touchMovePrevented = true;
            }
        });
        assert.equal(touchMovePrevented, true);

        elements['expense-input'].listeners.focus();
        assert.equal(active, true);
        assert.equal(lastViewportHeight, 640);
        assert.equal(bodyClasses.has('expense-input-active'), true);

        elements['expense-input'].listeners.blur();
        assert.equal(active, false);
        assert.equal(bodyClasses.has('expense-input-active'), false);
        assert.equal(timers[0].ms, 300);
        timers[0].callback();

        elements['btn-send'].listeners.touchstart();
        assert.equal(elements['btn-send'].classList.contains('pressed'), true);

        let touchEndPrevented = false;
        elements['btn-send'].listeners.touchend({
            preventDefault() {
                touchEndPrevented = true;
            }
        });
        elements['btn-send'].listeners.click();
        elements['btn-send'].listeners.click();

        let enterPrevented = false;
        elements['expense-input'].listeners.keydown({
            key: 'Enter',
            preventDefault() {
                enterPrevented = true;
            }
        });

        assert.equal(touchEndPrevented, true);
        assert.equal(enterPrevented, true);
        assert.equal(submitCount, 3);
        assert.deepEqual(calls, [
            ['active', true],
            'push-input',
            'start-watch',
            ['schedule', true],
            'stop-watch',
            ['active', false],
            'update-padding',
            'consume-input'
        ]);
    });

    test('Controller barra input isola padding e watch tastiera da App', () => {
        const { InputBarController } = loadUiViews();
        const events = [];
        const frameCallbacks = [];
        const timerCallbacks = [];

        function classListWith(items = []) {
            const classes = new Set(items);
            return {
                contains(cls) {
                    return classes.has(cls);
                }
            };
        }

        const main = { style: {}, classList: classListWith() };
        const panel = { offsetHeight: 96, classList: classListWith() };
        const inputBar = { style: { bottom: '', transform: '' } };
        const elements = {
            'app-main': main,
            'filter-panel': panel,
            'input-bar': inputBar
        };
        const doc = {
            getElementById(id) {
                return elements[id] || null;
            }
        };

        let active = true;
        let filterSearch = false;
        let filterOpen = true;
        let rafId = null;
        let resizeHandler = null;
        let windowResizeHandler = null;
        let viewportResizeHandler = null;
        let nextRaf = 0;

        const win = {
            innerHeight: 800,
            visualViewport: {
                height: 500,
                offsetTop: 0,
                addEventListener(event, handler, options) {
                    viewportResizeHandler = handler;
                    events.push(['vv-add', event, options.passive]);
                },
                removeEventListener(event, handler) {
                    events.push(['vv-remove', event, handler === viewportResizeHandler]);
                }
            },
            addEventListener(event, handler, options) {
                windowResizeHandler = handler;
                events.push(['win-add', event, options.passive]);
            },
            removeEventListener(event, handler) {
                events.push(['win-remove', event, handler === windowResizeHandler]);
            }
        };
        const options = {
            document: doc,
            window: win,
            isExpenseInputActive: () => active,
            isFilterSearchActive: () => filterSearch,
            isFilterOpen: () => filterOpen,
            getRafId: () => rafId,
            setRafId: value => { rafId = value; },
            getResizeHandler: () => resizeHandler,
            setResizeHandler: value => { resizeHandler = value; },
            requestAnimationFrame: callback => {
                frameCallbacks.push(callback);
                nextRaf += 1;
                return nextRaf;
            },
            cancelAnimationFrame: id => events.push(['cancel', id]),
            setTimeout: (callback, ms) => {
                timerCallbacks.push({ callback, ms });
                return timerCallbacks.length;
            }
        };

        assert.equal(InputBarController.getKeyboardInset(options), 300);

        InputBarController.updateAppMainPadding(options);
        assert.equal(
            main.style.paddingBottom,
            'calc(var(--input-h) + var(--nav-h) + var(--safe-bottom) + 300px - var(--nav-h) + 96px)'
        );

        InputBarController.updatePosition(options, true);
        assert.equal(inputBar.style.bottom, '300px');
        assert.equal(inputBar.style.transform, 'none');

        InputBarController.schedulePositionUpdate(options);
        InputBarController.schedulePositionUpdate(options);
        assert.equal(rafId, 2);
        assert.deepEqual(events.slice(-1), [['cancel', 1]]);

        frameCallbacks[1]();
        assert.equal(rafId, null);

        active = false;
        InputBarController.updatePosition(options, true);
        assert.equal(inputBar.style.bottom, '');
        assert.equal(inputBar.style.transform, '');

        active = true;
        filterSearch = true;
        filterOpen = false;
        events.length = 0;
        frameCallbacks.length = 0;
        timerCallbacks.length = 0;
        nextRaf = 0;

        InputBarController.startWatch(options);

        assert.equal(resizeHandler, windowResizeHandler);
        assert.equal(resizeHandler, viewportResizeHandler);
        assert.deepEqual(events.slice(0, 2), [
            ['win-add', 'resize', true],
            ['vv-add', 'resize', true]
        ]);
        assert.deepEqual(timerCallbacks.map(timer => timer.ms), [60, 160, 320]);
        assert.equal(rafId, 1);

        resizeHandler();
        assert.equal(rafId, 2);
        assert.deepEqual(events.slice(-1), [['cancel', 1]]);

        frameCallbacks[1]();
        assert.equal(rafId, null);

        timerCallbacks[0].callback();
        assert.equal(rafId, 3);

        active = false;
        timerCallbacks[1].callback();
        assert.equal(rafId, 3);

        InputBarController.stopWatch(options);

        assert.equal(rafId, null);
        assert.equal(resizeHandler, null);
        assert.equal(inputBar.style.bottom, '');
        assert.equal(inputBar.style.transform, '');
        assert.deepEqual(events.slice(-3), [
            ['cancel', 3],
            ['win-remove', 'resize', true],
            ['vv-remove', 'resize', true]
        ]);
    });
};
