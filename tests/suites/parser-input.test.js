import {
    assert,
    loadParser,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
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
        assert.deepEqual(events.slice(0, 3), [
            ['win-add', 'resize', true],
            ['vv-add', 'resize', true],
            ['vv-add', 'scroll', true]
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
        assert.deepEqual(events.slice(-4), [
            ['cancel', 3],
            ['win-remove', 'resize', true],
            ['vv-remove', 'resize', true],
            ['vv-remove', 'scroll', true]
        ]);
    });

    test('InputBarController gestisce visualViewport su iPhone senza interferire con resize layout Android', () => {
        const { InputBarController } = loadUiViews();
        const rootVars = {};
        const bodyClasses = new Set();
        const docListeners = {};
        const vvListeners = {};
        const timers = [];
        const scrollCalls = [];

        const main = { style: {}, classList: { contains: () => false } };
        const inputBar = { style: { bottom: '', transform: '' } };
        const doc = {
            body: {
                classList: {
                    add(cls) { bodyClasses.add(cls); },
                    remove(cls) { bodyClasses.delete(cls); },
                    contains(cls) { return bodyClasses.has(cls); }
                }
            },
            documentElement: {
                style: {
                    setProperty(name, value) { rootVars[name] = value; },
                    removeProperty(name) { delete rootVars[name]; }
                }
            },
            getElementById(id) {
                if (id === 'app-main') return main;
                if (id === 'input-bar') return inputBar;
                return null;
            },
            addEventListener(event, handler) {
                docListeners[event] = handler;
            },
            removeEventListener(event) {
                delete docListeners[event];
            }
        };

        let active = true;
        let resizeHandler = null;
        const win = {
            innerHeight: 852,
            scrollY: 0,
            scrollX: 0,
            scrollTo(x, y) { scrollCalls.push([x, y]); },
            visualViewport: {
                height: 516,
                offsetTop: 336,
                addEventListener(event, handler) { vvListeners[event] = handler; },
                removeEventListener(event) { delete vvListeners[event]; }
            },
            addEventListener() { },
            removeEventListener() { }
        };

        const options = {
            document: doc,
            window: win,
            isExpenseInputActive: () => active,
            isFilterSearchActive: () => false,
            isFilterOpen: () => false,
            getResizeHandler: () => resizeHandler,
            setResizeHandler: value => { resizeHandler = value; },
            requestAnimationFrame: cb => { cb(); return null; },
            cancelAnimationFrame: () => { },
            setTimeout: (cb, ms) => {
                timers.push({ cb, ms });
                return timers.length;
            }
        };

        InputBarController.startWatch(options);
        assert.equal(bodyClasses.has('vv-keyboard-open'), true);
        assert.equal(rootVars['--vv-offset-top'], '336px');
        assert.equal(rootVars['--vv-height'], '516px');
        assert.equal(rootVars['--vv-bottom-inset'], '0px');
        assert.equal(inputBar.style.bottom, '0px');
        assert.equal(inputBar.style.transform, 'none');

        win.visualViewport.offsetTop = 200;
        vvListeners.scroll({ type: 'scroll' });
        assert.equal(rootVars['--vv-offset-top'], '200px');
        assert.equal(rootVars['--vv-bottom-inset'], '136px');
        assert.equal(inputBar.style.bottom, '136px');

        // Simula Android Chrome con resize layout dove innerHeight e vv.height coincidono
        win.innerHeight = 516;
        win.visualViewport.height = 516;
        win.visualViewport.offsetTop = 0;
        InputBarController.updatePosition(options, true);
        assert.equal(bodyClasses.has('vv-keyboard-open'), false);
        assert.equal(rootVars['--vv-offset-top'], undefined);
        assert.equal(inputBar.style.bottom, '');

        // Torna a stato iOS panned poi stopWatch deve pulire e resettare scrollTo(0, 0)
        win.innerHeight = 852;
        win.visualViewport.height = 516;
        win.visualViewport.offsetTop = 240;
        InputBarController.updatePosition(options, true);
        assert.equal(bodyClasses.has('vv-keyboard-open'), true);

        active = false;
        timers.length = 0;
        InputBarController.stopWatch(options);
        assert.equal(bodyClasses.has('vv-keyboard-open'), false);
        assert.equal(rootVars['--vv-offset-top'], undefined);
        assert.equal(rootVars['--vv-height'], undefined);
        assert.equal(rootVars['--vv-bottom-inset'], undefined);
        assert.equal(docListeners.touchstart, undefined);
        assert.equal(vvListeners.scroll, undefined);
        assert.equal(timers[0].ms, 80);
        timers[0].cb();
        assert.deepEqual(scrollCalls, [[0, 0]]);
    });

    test('InputBarController blocca lo scroll fuori dalla lista spese quando la tastiera e aperta', () => {
        const { InputBarController } = loadUiViews();
        const bodyClasses = new Set();
        const docListeners = {};
        let resizeHandler = null;

        const main = {
            style: {},
            scrollTop: 0,
            scrollHeight: 1200,
            clientHeight: 400,
            classList: { contains: () => false }
        };
        const inputBar = { style: { bottom: '', transform: '' } };
        const doc = {
            body: {
                classList: {
                    add(cls) { bodyClasses.add(cls); },
                    remove(cls) { bodyClasses.delete(cls); },
                    contains(cls) { return bodyClasses.has(cls); }
                }
            },
            documentElement: { style: { setProperty() { }, removeProperty() { } } },
            getElementById(id) {
                if (id === 'app-main') return main;
                if (id === 'input-bar') return inputBar;
                return null;
            },
            addEventListener(event, handler) {
                docListeners[event] = handler;
            },
            removeEventListener(event) {
                delete docListeners[event];
            }
        };

        const options = {
            document: doc,
            window: {
                innerHeight: 852,
                visualViewport: {
                    height: 500,
                    offsetTop: 0,
                    addEventListener() { },
                    removeEventListener() { }
                },
                addEventListener() { },
                removeEventListener() { }
            },
            isExpenseInputActive: () => true,
            isFilterSearchActive: () => false,
            isFilterOpen: () => false,
            getResizeHandler: () => resizeHandler,
            setResizeHandler: value => { resizeHandler = value; },
            requestAnimationFrame: cb => { cb(); return null; },
            cancelAnimationFrame: () => { },
            setTimeout: () => 1
        };

        function makeTarget(matches = [], scrollNode = null) {
            return {
                closest(selector) {
                    const parts = String(selector).split(',').map(part => part.trim());
                    if (matches.some(match => parts.includes(match))) {
                        return scrollNode || {};
                    }
                    return null;
                }
            };
        }

        function simulateMove(target, startY, moveX, moveY) {
            let prevented = false;
            docListeners.touchstart({
                touches: [{ clientX: 150, clientY: startY }]
            });
            docListeners.touchmove({
                target,
                touches: [{ clientX: 150 + moveX, clientY: startY + moveY }],
                preventDefault() { prevented = true; }
            });
            docListeners.touchend({});
            return prevented;
        }

        InputBarController.startWatch(options);
        assert.equal(bodyClasses.has('vv-keyboard-open'), true);

        const bannerTarget = makeTarget(['#timeline-summary']);
        assert.equal(simulateMove(bannerTarget, 120, 0, -24), true);

        const listTarget = makeTarget(['#app-main'], main);
        main.scrollTop = 0;
        assert.equal(simulateMove(listTarget, 220, 0, 24), true, 'Pull down al top bloccato');
        assert.equal(simulateMove(listTarget, 220, 0, -24), false, 'Scroll giu dal top consentito');

        main.scrollTop = 300;
        assert.equal(simulateMove(listTarget, 220, 0, 24), false, 'Scroll su a meta lista consentito');
        assert.equal(simulateMove(listTarget, 220, 0, -24), false, 'Scroll giu a meta lista consentito');

        main.scrollTop = 800;
        assert.equal(simulateMove(listTarget, 220, 0, -24), true, 'Pull up al fondo bloccato');

        assert.equal(simulateMove(makeTarget([]), 220, 40, -4), false, 'Swipe orizzontale preservato');

        main.scrollHeight = 300;
        main.scrollTop = 0;
        assert.equal(simulateMove(listTarget, 220, 0, -24), true, 'Lista non scrollabile non muove viewport');

        InputBarController.stopWatch(options);
    });

    test('ExpenseInputController chiude tastiera al tap esterno ma non durante lo scroll', () => {
        const { ExpenseInputController } = loadUiViews();
        const docListeners = {};
        const timers = [];
        let active = true;
        let blurCount = 0;
        let ignoreSyncBlur = false;

        function element(id, tagName = 'DIV', parentMatch = []) {
            const classes = new Set();
            return {
                id,
                tagName,
                value: '',
                style: {},
                listeners: {},
                classList: {
                    add(cls) { classes.add(cls); },
                    remove(cls) { classes.delete(cls); },
                    contains(cls) { return classes.has(cls); }
                },
                contains(node) {
                    return node === this || parentMatch.includes(node);
                },
                closest(selector) {
                    const parts = String(selector).split(',').map(part => part.trim());
                    return parts.includes(`#${id}`) || parts.includes(tagName.toLowerCase()) ? this : null;
                },
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                }
            };
        }

        const btnSend = element('btn-send', 'BUTTON');
        const btnVoice = element('btn-voice', 'BUTTON');
        const input = element('expense-input', 'TEXTAREA');
        const inputBar = element('input-bar', 'DIV', [input, btnSend, btnVoice]);
        const searchInput = element('search-input', 'TEXTAREA');
        const summary = element('timeline-summary', 'DIV');
        const elements = {
            'expense-input': input,
            'btn-send': btnSend,
            'btn-voice': btnVoice,
            'input-bar': inputBar
        };

        const doc = {
            activeElement: input,
            body: { classList: { add() { }, remove() { }, contains: () => false } },
            getElementById(id) { return elements[id] || null; },
            addEventListener(event, handler) {
                docListeners[event] = handler;
            }
        };

        input.blur = () => {
            blurCount += 1;
            if (!ignoreSyncBlur) {
                doc.activeElement = doc.body;
                active = false;
            }
        };

        ExpenseInputController.init({
            document: doc,
            window: {},
            isInputActive: () => active,
            setInputActive: value => { active = value; },
            setTimeout: (cb, ms) => {
                timers.push({ cb, ms });
                return timers.length;
            },
            clearTimeout: () => { }
        });

        // Drag verticale (> 10px) non deve chiudere la tastiera, neanche se segue un click spurio
        docListeners.touchstart({ target: summary, touches: [{ clientX: 100, clientY: 200 }] });
        docListeners.touchmove({ touches: [{ clientX: 100, clientY: 160 }] });
        docListeners.touchend({ target: summary, changedTouches: [{ clientX: 100, clientY: 160 }] });
        docListeners.click({ target: summary });
        assert.equal(blurCount, 0);
        assert.equal(active, true);

        // Tap dentro #input-bar (#btn-send) non deve chiudere la tastiera
        docListeners.touchstart({ target: btnSend, touches: [{ clientX: 300, clientY: 700 }] });
        docListeners.touchend({ target: btnSend, changedTouches: [{ clientX: 300, clientY: 701 }] });
        assert.equal(blurCount, 0);

        // Tap su un altro input/textarea (#search-input) lascia trasferire il focus al browser
        docListeners.touchstart({ target: searchInput, touches: [{ clientX: 120, clientY: 80 }] });
        docListeners.touchend({ target: searchInput, changedTouches: [{ clientX: 121, clientY: 80 }] });
        assert.equal(blurCount, 0);

        // Interazione iniziata dentro #input-bar sopprime click spuri e mousedown finiti fuori al cambio layout
        let prevented = 0;
        let stopped = 0;
        docListeners.touchstart({ target: input, touches: [{ clientX: 120, clientY: 700 }] });
        docListeners.touchend({ target: input, changedTouches: [{ clientX: 120, clientY: 700 }] });
        docListeners.mousedown({ target: summary });
        docListeners.click({
            target: summary,
            preventDefault() { prevented += 1; },
            stopPropagation() { stopped += 1; }
        });
        assert.equal(blurCount, 0);
        assert.equal(active, true);
        assert.equal(prevented, 1, 'Click spurio fuori da #input-bar dopo pre-lift va neutralizzato');
        assert.equal(stopped, 1);

        // Un nuovo touchstart fuori da #input-bar sblocca subito il dismiss
        docListeners.touchstart({ target: summary, touches: [{ clientX: 100, clientY: 120 }] });
        docListeners.touchend({ target: summary, changedTouches: [{ clientX: 102, clientY: 122 }] });
        assert.equal(blurCount, 1);
        assert.equal(active, false);

        // Mouse/click reale fuori con mousedown precedente chiude comunque e attiva retry iOS
        active = true;
        doc.activeElement = input;
        docListeners.mousedown({ target: btnSend });
        docListeners.click({ target: summary });
        assert.equal(blurCount, 1, 'mousedown interno sopprime click esterno imminente');

        docListeners.mousedown({ target: summary });
        ignoreSyncBlur = true;
        docListeners.click({ target: summary });
        assert.equal(blurCount, 2);
        assert.equal(timers[0].ms, 0);
        ignoreSyncBlur = false;
        timers[0].cb();
        assert.equal(blurCount, 3);
        assert.equal(active, false);
    });

    test('InputBarController nasconde bottom-nav e aggiorna baseline/polling per PWA standalone iPhone', () => {
        const { InputBarController } = loadUiViews();
        const rootVars = {};
        const bodyClasses = new Set();
        const intervals = [];
        const clearedIntervals = [];
        const timers = [];
        const clearedTimers = [];
        const scrollCalls = [];
        const winListeners = {};
        const vvListeners = {};
        const frameQueue = [];

        const main = { style: {}, classList: { contains: () => false } };
        const header = { offsetHeight: 56 };
        const inputBar = { offsetHeight: 68, style: { bottom: '', transform: '' } };
        const doc = {
            body: {
                classList: {
                    add(cls) { bodyClasses.add(cls); },
                    remove(cls) { bodyClasses.delete(cls); },
                    contains(cls) { return bodyClasses.has(cls); }
                }
            },
            documentElement: {
                clientHeight: 852,
                style: {
                    setProperty(name, value) { rootVars[name] = value; },
                    removeProperty(name) { delete rootVars[name]; }
                }
            },
            getElementById(id) {
                if (id === 'app-main') return main;
                if (id === 'app-header') return header;
                if (id === 'input-bar') return inputBar;
                return null;
            }
        };

        let active = true;
        let resizeHandler = null;
        let nextFrameId = 0;
        let fakeNow = 1000;
        const iphoneWin = {
            innerWidth: 393,
            innerHeight: 852,
            scrollY: 0,
            performance: { now: () => fakeNow },
            navigator: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
            },
            scrollTo(x, y) { scrollCalls.push([x, y]); },
            visualViewport: {
                width: 393,
                height: 852,
                offsetTop: 0,
                addEventListener(event, handler) {
                    if (!vvListeners[event]) vvListeners[event] = new Set();
                    vvListeners[event].add(handler);
                },
                removeEventListener(event, handler) {
                    if (vvListeners[event]) vvListeners[event].delete(handler);
                }
            },
            addEventListener(event, handler) {
                if (!winListeners[event]) winListeners[event] = new Set();
                winListeners[event].add(handler);
            },
            removeEventListener(event, handler) {
                if (winListeners[event]) winListeners[event].delete(handler);
            }
        };

        const emit = (map, event, payload = { type: event }) => {
            if (!map[event]) return;
            Array.from(map[event]).forEach(handler => handler(payload));
        };

        const iphoneOptions = {
            document: doc,
            window: iphoneWin,
            isExpenseInputActive: () => active,
            isFilterSearchActive: () => false,
            isFilterOpen: () => false,
            getResizeHandler: () => resizeHandler,
            setResizeHandler: value => { resizeHandler = value; },
            requestAnimationFrame: cb => {
                const id = ++nextFrameId;
                frameQueue.push({ id, cb });
                return id;
            },
            cancelAnimationFrame: id => {
                const index = frameQueue.findIndex(item => item.id === id);
                if (index >= 0) frameQueue.splice(index, 1);
            },
            setTimeout: (cb, ms) => {
                const entry = { id: timers.length + 1, cb, ms, cleared: false };
                timers.push(entry);
                return entry.id;
            },
            clearTimeout: id => {
                clearedTimers.push(id);
                const found = timers.find(item => item.id === id);
                if (found) found.cleared = true;
            },
            setInterval: (cb, ms) => {
                intervals.push({ cb, ms });
                return intervals.length;
            },
            clearInterval: id => clearedIntervals.push(id)
        };

        // 1. Subito al focus (t=0): ios-expense-input-active, ios-input-bar-prelift e pre-lift sincrono al centro libero (top=164 -> bottom=620px)
        InputBarController.startWatch(iphoneOptions);
        assert.equal(bodyClasses.has('ios-expense-input-active'), true);
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), true);
        assert.equal(inputBar.style.bottom, '620px');
        assert.equal(inputBar.style.transform, 'none');
        fakeNow = 1100;
        iphoneWin.visualViewport.height = 802;
        iphoneWin.visualViewport.offsetTop = 0;
        InputBarController.updatePosition(iphoneOptions);
        assert.equal(inputBar.style.bottom, '620px');
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), true);
        iphoneWin.visualViewport.height = 852;
        assert.equal(intervals[0].ms, 120);
        assert.equal(winListeners.scroll.size, 1);
        assert(frameQueue.length > 0, 'Sync rAF di transizione attesa su iPhone');

        // 2. PWA standalone iPhone: innerHeight e vv.height si riducono entrambi (852 -> 452) e prelift diventa visibile
        iphoneWin.innerHeight = 452;
        doc.documentElement.clientHeight = 452;
        iphoneWin.visualViewport.height = 452;
        iphoneWin.visualViewport.offsetTop = 0;
        intervals[0].cb();
        assert.equal(bodyClasses.has('vv-keyboard-open'), true);
        assert.equal(bodyClasses.has('ios-expense-input-active'), true);
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), false);
        assert.equal(rootVars['--vv-height'], '452px');
        assert.equal(rootVars['--vv-offset-top'], '0px');
        assert.equal(rootVars['--vv-bottom-inset'], '0px');
        assert.equal(inputBar.style.bottom, '0px');

        // 2b. PWA standalone iPhone reale (log iOS 18.7): innerHeight=397, clientHeight=793, vv.height=397
        iphoneWin.innerHeight = 397;
        doc.documentElement.clientHeight = 793;
        iphoneWin.visualViewport.height = 397;
        iphoneWin.visualViewport.offsetTop = 0;
        emit(vvListeners, 'resize');
        assert.equal(InputBarController.getVisualViewportMetrics(iphoneOptions).fixedViewportHeight, 793);
        assert.equal(InputBarController.getVisualViewportMetrics(iphoneOptions).isKeyboardOpen, true);
        assert.equal(rootVars['--vv-bottom-inset'], '396px');
        assert.equal(inputBar.style.bottom, '396px');

        iphoneWin.visualViewport.offsetTop = 120;
        emit(vvListeners, 'scroll');
        assert.equal(rootVars['--vv-bottom-inset'], '276px');
        assert.equal(inputBar.style.bottom, '276px');

        iphoneWin.visualViewport.offsetTop = 396;
        emit(vvListeners, 'scroll');
        assert.equal(rootVars['--vv-bottom-inset'], '0px');
        assert.equal(inputBar.style.bottom, '0px');

        // 3. offsetTop non viene azzerato prima che vv.height cali e vv.resize aggiorna subito
        iphoneWin.innerHeight = 852;
        doc.documentElement.clientHeight = 852;
        iphoneWin.visualViewport.height = 852;
        iphoneWin.visualViewport.offsetTop = 336;
        emit(vvListeners, 'resize');
        assert.equal(rootVars['--vv-offset-top'], '336px');
        assert.equal(bodyClasses.has('vv-keyboard-open'), true);

        iphoneWin.visualViewport.height = 516;
        iphoneWin.visualViewport.offsetTop = 336;
        emit(vvListeners, 'resize');
        assert.equal(rootVars['--vv-offset-top'], '336px');
        assert.equal(rootVars['--vv-bottom-inset'], '0px');

        // 4. Blur con vv.offsetTop > 0 entra in vv-keyboard-settling e segue lo scorrimento fino a 0
        active = false;
        timers.length = 0;
        InputBarController.stopWatch(iphoneOptions);
        assert.equal(bodyClasses.has('ios-expense-input-active'), false);
        assert.equal(bodyClasses.has('vv-keyboard-open'), false);
        assert.equal(bodyClasses.has('vv-keyboard-settling'), true);
        assert.equal(rootVars['--vv-height'], undefined);
        assert.equal(rootVars['--vv-bottom-inset'], undefined);
        assert.equal(rootVars['--vv-offset-top'], '336px');
        assert.deepEqual(clearedIntervals, [1]);
        const settleTimer = timers.find(t => t.ms === 450);
        assert(settleTimer, 'Timeout di sicurezza close-settle atteso');

        iphoneWin.visualViewport.offsetTop = 180;
        emit(vvListeners, 'scroll');
        assert.equal(rootVars['--vv-offset-top'], '180px');
        assert.equal(bodyClasses.has('vv-keyboard-settling'), true);

        iphoneWin.visualViewport.offsetTop = 0;
        emit(vvListeners, 'scroll');
        assert.equal(bodyClasses.has('vv-keyboard-settling'), false);
        assert.equal(rootVars['--vv-offset-top'], undefined);
        assert.equal(settleTimer.cleared, true);
        assert.equal(vvListeners.scroll.size, 0);

        // 4b. Fallback 450ms ripulisce vv-keyboard-settling se offsetTop resta > 0 e resetta scroll
        active = true;
        iphoneWin.visualViewport.height = 516;
        iphoneWin.visualViewport.offsetTop = 300;
        InputBarController.startWatch(iphoneOptions);
        active = false;
        timers.length = 0;
        iphoneWin.scrollY = 24;
        InputBarController.stopWatch(iphoneOptions);
        assert.equal(bodyClasses.has('vv-keyboard-settling'), true);
        const fallbackTimer = timers.find(t => t.ms === 450);
        assert(fallbackTimer);
        fallbackTimer.cb();
        assert.equal(bodyClasses.has('vv-keyboard-settling'), false);
        assert.equal(rootVars['--vv-offset-top'], undefined);
        assert.deepEqual(scrollCalls, [[0, 0]]);
        iphoneWin.scrollY = 0;

        // 4c. Re-focus rapido durante close-settle mantiene --vv-offset-top senza scatti
        active = true;
        iphoneWin.visualViewport.offsetTop = 280;
        InputBarController.startWatch(iphoneOptions);
        active = false;
        InputBarController.stopWatch(iphoneOptions);
        assert.equal(bodyClasses.has('vv-keyboard-settling'), true);
        assert.equal(rootVars['--vv-offset-top'], '280px');
        active = true;
        InputBarController.startWatch(iphoneOptions);
        assert.equal(bodyClasses.has('vv-keyboard-settling'), false);
        assert.equal(bodyClasses.has('vv-keyboard-open'), true);
        assert.equal(rootVars['--vv-offset-top'], '280px');
        active = false;
        iphoneWin.visualViewport.offsetTop = 0;
        InputBarController.stopWatch(iphoneOptions);
        assert.equal(rootVars['--vv-offset-top'], undefined);

        // 4d. Riapertura con viewport 793 (standalone reale) fa pre-lift sincrono a 561px e scade dopo 650ms senza tastiera
        fakeNow = 2000;
        let pwaActive = true;
        let pwaResizeHandler = null;
        let pwaRafId = null;
        const pwaDoc = {
            ...doc,
            documentElement: {
                clientHeight: 793,
                style: doc.documentElement.style
            }
        };
        const pwaWin = {
            ...iphoneWin,
            innerHeight: 793,
            performance: { now: () => fakeNow },
            visualViewport: {
                width: 393,
                height: 793,
                offsetTop: 0,
                addEventListener() { },
                removeEventListener() { }
            },
            addEventListener() { },
            removeEventListener() { }
        };
        const pwaOptions = {
            document: pwaDoc,
            window: pwaWin,
            isExpenseInputActive: () => pwaActive,
            isFilterSearchActive: () => false,
            isFilterOpen: () => false,
            getRafId: () => pwaRafId,
            setRafId: value => { pwaRafId = value; },
            getResizeHandler: () => pwaResizeHandler,
            setResizeHandler: value => { pwaResizeHandler = value; },
            requestAnimationFrame: () => 1,
            cancelAnimationFrame: () => { },
            setTimeout: () => 1,
            clearTimeout: () => { },
            setInterval: () => 1,
            clearInterval: () => { }
        };
        InputBarController.startWatch(pwaOptions);
        assert.equal(inputBar.style.bottom, '561px');
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), true);

        fakeNow = 2700;
        InputBarController.updatePosition(pwaOptions);
        assert.equal(inputBar.style.bottom, '');
        assert.equal(inputBar.style.transform, '');
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), false);
        pwaActive = false;
        InputBarController.stopWatch(pwaOptions);
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), false);

        // 5. Android con resize layout non attiva ios-expense-input-active ne pre-lift ne clientHeight override
        let androidActive = true;
        let androidResize = null;
        const androidDoc = {
            ...doc,
            documentElement: {
                clientHeight: 852,
                style: doc.documentElement.style
            }
        };
        const androidWin = {
            innerWidth: 412,
            innerHeight: 480,
            navigator: {
                userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
            },
            visualViewport: {
                width: 412,
                height: 480,
                offsetTop: 0,
                addEventListener() { },
                removeEventListener() { }
            },
            addEventListener() { },
            removeEventListener() { }
        };
        const androidMetrics = InputBarController.getVisualViewportMetrics({
            document: androidDoc,
            window: androidWin
        });
        assert.equal(androidMetrics.fixedViewportHeight, 480);
        assert.equal(androidMetrics.bottomInset, 0);
        InputBarController.startWatch({
            document: androidDoc,
            window: androidWin,
            isExpenseInputActive: () => androidActive,
            isFilterSearchActive: () => false,
            isFilterOpen: () => false,
            getResizeHandler: () => androidResize,
            setResizeHandler: value => { androidResize = value; },
            requestAnimationFrame: cb => { cb(); return null; },
            cancelAnimationFrame: () => { },
            setTimeout: () => 1
        });
        assert.equal(bodyClasses.has('ios-expense-input-active'), false);
        assert.equal(bodyClasses.has('ios-input-bar-prelift'), false);
        assert.equal(bodyClasses.has('vv-keyboard-open'), false);
        assert.equal(inputBar.style.bottom, '');
        androidActive = false;
        InputBarController.stopWatch({
            document: androidDoc,
            window: androidWin,
            isExpenseInputActive: () => false,
            isFilterSearchActive: () => false,
            isFilterOpen: () => false,
            getResizeHandler: () => androidResize,
            setResizeHandler: value => { androidResize = value; },
            cancelAnimationFrame: () => { },
            setTimeout: () => 1
        });
    });

    test('InputBarController.initDevDiagnostics si attiva solo su canale dev e registra eventi viewport', () => {
        const { InputBarController } = loadUiViews();

        function makeMockEl(id = '', tagName = 'DIV') {
            const listeners = {};
            const classes = new Set();
            const el = {
                id,
                tagName,
                style: {},
                value: '',
                textContent: '',
                parentNode: null,
                children: [],
                rect: { top: 0, bottom: 0, height: 0 },
                attributes: {},
                listeners,
                classList: {
                    add(c) { classes.add(c); },
                    remove(c) { classes.delete(c); },
                    contains(c) { return classes.has(c); }
                },
                setAttribute(name, val) { this.attributes[name] = val; },
                getBoundingClientRect() { return this.rect; },
                appendChild(child) {
                    child.parentNode = this;
                    this.children.push(child);
                    if (child.id) nodesById.set(child.id, child);
                    return child;
                },
                insertBefore(child, ref) {
                    child.parentNode = this;
                    const idx = this.children.indexOf(ref);
                    if (idx >= 0) this.children.splice(idx, 0, child);
                    else this.children.push(child);
                    if (child.id) nodesById.set(child.id, child);
                    return child;
                },
                addEventListener(type, fn, opts) {
                    if (!listeners[type]) listeners[type] = [];
                    listeners[type].push({ fn, capture: !!(opts && opts.capture) });
                }
            };
            return el;
        }

        const nodesById = new Map();
        const registerEl = (el, rect) => {
            if (rect) el.rect = rect;
            if (el.id) nodesById.set(el.id, el);
            return el;
        };

        const header = registerEl(makeMockEl('app-header', 'HEADER'), { top: 0, bottom: 56, height: 56 });
        const headerActions = makeMockEl('', 'DIV');
        const themeToggle = registerEl(makeMockEl('theme-toggle', 'BUTTON'));
        headerActions.appendChild(themeToggle);
        header.appendChild(headerActions);

        const summary = registerEl(makeMockEl('timeline-summary', 'DIV'), { top: 68, bottom: 132, height: 64 });
        const appMain = registerEl(makeMockEl('app-main', 'MAIN'), { top: 56, bottom: 852, height: 796 });
        const inputBar = registerEl(makeMockEl('input-bar', 'DIV'), { top: 724, bottom: 788, height: 64 });
        const expenseInput = registerEl(makeMockEl('expense-input', 'TEXTAREA'), { top: 732, bottom: 772, height: 40 });
        const body = makeMockEl('', 'BODY');
        body.rect = { top: 0, bottom: 852, height: 852 };

        const docListeners = {};
        const doc = {
            body,
            activeElement: body,
            documentElement: {
                clientHeight: 852,
                style: {}
            },
            getElementById: id => nodesById.get(id) || null,
            querySelector: sel => {
                if (sel === '#app-header .header-actions') return headerActions;
                if (sel === '.stats-sticky-header') return null;
                return null;
            },
            createElement: tag => makeMockEl('', String(tag).toUpperCase()),
            addEventListener(type, fn, opts) {
                if (!docListeners[type]) docListeners[type] = [];
                docListeners[type].push({ fn, capture: !!(opts && opts.capture) });
            }
        };

        // 1. Canale stable/assente non inietta UI ne registra listener
        const stableWin = {
            innerHeight: 852,
            SPESA_TRACKER_CONFIG: { storageKey: 'spesa-tracker-data', channel: 'stable' },
            getComputedStyle: () => ({ bottom: '64px', getPropertyValue: () => '' })
        };
        assert.equal(InputBarController.initDevDiagnostics({ document: doc, window: stableWin }), null);
        assert.equal(InputBarController.initDevDiagnostics({ document: doc, window: { innerHeight: 852 } }), null);
        assert.equal(nodesById.get('btn-dev-vv-diag'), undefined);

        // 2. Canale dev attiva registrazione completa e UI overlay
        const vvListeners = {};
        const devWin = {
            innerWidth: 393,
            innerHeight: 852,
            scrollY: 0,
            devicePixelRatio: 3,
            screen: { width: 393, height: 852, availHeight: 852 },
            location: { pathname: '/tracker-spese/dev/' },
            navigator: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
                standalone: true
            },
            SPESA_TRACKER_CONFIG: { storageKey: 'spesa-tracker-data-dev', channel: 'dev' },
            performance: { now: () => 1000 },
            getComputedStyle: el => {
                if (el === inputBar) return { bottom: '64px' };
                return { getPropertyValue: name => (name === '--vv-offset-top' ? '336px' : '') };
            },
            visualViewport: {
                height: 852,
                offsetTop: 0,
                scale: 1,
                addEventListener(type, fn) {
                    if (!vvListeners[type]) vvListeners[type] = [];
                    vvListeners[type].push(fn);
                }
            },
            addEventListener() { }
        };

        const diagOptions = {
            document: doc,
            window: devWin,
            requestAnimationFrame: cb => { cb(); return 1; },
            cancelAnimationFrame: () => { },
            setTimeout: () => 1,
            clearTimeout: () => { }
        };
        const state = InputBarController.initDevDiagnostics(diagOptions);
        assert(state, 'Deve restituire lo stato diagnostico su channel dev');
        assert.equal(InputBarController.initDevDiagnostics(diagOptions), state, 'Chiamate ripetute non duplicano lo stato');

        const diagBtn = nodesById.get('btn-dev-vv-diag');
        assert(diagBtn, 'Deve iniettare il bottone #btn-dev-vv-diag');
        assert.equal(headerActions.children[0], diagBtn, 'Il bottone VV va inserito prima di #theme-toggle');

        // Simula sequenza focus:pre -> focus:post -> vv:resize -> blur:pre -> blur:post
        doc.activeElement = expenseInput;
        docListeners.focus.forEach(entry => entry.fn({ target: expenseInput }));
        expenseInput.listeners.focus.forEach(entry => entry.fn({ target: expenseInput }));

        devWin.visualViewport.height = 516;
        devWin.visualViewport.offsetTop = 336;
        inputBar.style.bottom = '0px';
        body.classList.add('expense-input-active');
        body.classList.add('ios-expense-input-active');
        body.classList.add('vv-keyboard-open');
        vvListeners.resize.forEach(fn => fn());

        doc.activeElement = body;
        docListeners.blur.forEach(entry => entry.fn({ target: expenseInput }));
        expenseInput.listeners.blur.forEach(entry => entry.fn({ target: expenseInput }));

        const logText = state.getText();
        assert(logText.includes('standalone=true'), 'Meta standalone presente');
        assert(logText.includes('[init]'), 'Evento init presente');
        assert(logText.includes('[focus:pre]'), 'Evento focus:pre presente');
        assert(logText.includes('[focus:post]'), 'Evento focus:post presente');
        assert(logText.includes('[vv:resize]'), 'Evento vv:resize presente');
        assert(logText.includes('[blur:pre]'), 'Evento blur:pre presente');
        assert(logText.includes('[blur:post]'), 'Evento blur:post presente');
        assert(logText.includes('ih=852') && logText.includes('vvh=516') && logText.includes('vvo=336'), 'Metriche viewport attese nel log');
        assert(logText.includes('ib=724..788(0px)'), 'Metriche #input-bar attese nel log');

        // Apre overlay e verifica clear + close
        diagBtn.listeners.click.forEach(entry => entry.fn());
        const overlay = nodesById.get('dev-vv-diag-overlay');
        const textarea = nodesById.get('dev-vv-diag-log');
        const btnClear = nodesById.get('btn-dev-vv-clear');
        const btnClose = nodesById.get('btn-dev-vv-close');
        assert(overlay && overlay.style.display === 'flex');
        assert(textarea.value.includes('[vv:resize]'));

        btnClear.listeners.click.forEach(entry => entry.fn());
        assert.equal(textarea.value.includes('[vv:resize]'), false);
        assert(textarea.value.includes('[init]'));

        btnClose.listeners.click.forEach(entry => entry.fn());
        assert.equal(overlay.style.display, 'none');
    });
};
