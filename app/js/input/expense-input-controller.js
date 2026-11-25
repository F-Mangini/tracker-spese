/* ============================================
   EXPENSE INPUT CONTROLLER - eventi input rapido
   ============================================ */

export const ExpenseInputController = (() => {
    const TAP_MOVE_LIMIT = 10;
    const INPUT_BAR_CLICK_SUPPRESS_MS = 700;
    const SCROLL_CLICK_SUPPRESS_MS = 400;

    function call(fn, ...args) {
        if (typeof fn === 'function') return fn(...args);
        return undefined;
    }

    function getTimer(options, name, fallbackName) {
        if (typeof options[name] === 'function') return options[name];
        if (typeof globalThis !== 'undefined' && typeof globalThis[fallbackName] === 'function') {
            return globalThis[fallbackName].bind(globalThis);
        }
        return null;
    }

    function init(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const activeWindow = options.window || (typeof window !== 'undefined' ? window : null);
        if (!activeDocument || !activeWindow) return null;

        const input = activeDocument.getElementById('expense-input');
        const btnSend = activeDocument.getElementById('btn-send');
        const btnVoice = activeDocument.getElementById('btn-voice');
        const inputBar = activeDocument.getElementById('input-bar');
        if (!input || !btnSend || !btnVoice || !inputBar) return null;

        const setTimer = getTimer(options, 'setTimeout', 'setTimeout');
        const clearTimer = getTimer(options, 'clearTimeout', 'clearTimeout');
        let touchHandled = false;
        let blurCleanupTimer = null;
        let recognition = null;

        inputBar.addEventListener('touchmove', e => {
            e.preventDefault();
        }, { passive: false });

        btnSend.addEventListener('touchstart', () => {
            btnSend.classList.add('pressed');
        }, { passive: true });

        btnSend.addEventListener('touchend', e => {
            btnSend.classList.remove('pressed');
            e.preventDefault();
            touchHandled = true;
            call(options.onSubmit);
        });

        btnSend.addEventListener('click', () => {
            if (touchHandled) {
                touchHandled = false;
                return;
            }

            call(options.onSubmit);
        });

        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;

            e.preventDefault();
            call(options.onSubmit);
        });

        const doBlurCleanup = () => {
            if (activeDocument.body && activeDocument.body.classList) {
                activeDocument.body.classList.remove('expense-input-active');
            }

            call(options.stopInputBarWatch);
            call(options.setInputActive, false);
            call(options.updateAppMainPadding);

            if (setTimer) {
                blurCleanupTimer = setTimer(() => {
                    call(options.consumeInputState);
                }, 300);
            }
        };

        input.addEventListener('focus', () => {
            if (blurCleanupTimer && clearTimer) {
                clearTimer(blurCleanupTimer);
                blurCleanupTimer = null;
            }

            const isActive = !!call(options.isInputActive);
            const wasInactive = !isActive;

            call(options.setInputActive, true);
            call(options.setLastViewportHeight, call(options.getViewportHeight));

            if (activeDocument.body && activeDocument.body.classList) {
                activeDocument.body.classList.add('expense-input-active');
            }

            if (wasInactive) {
                call(options.pushInputState);
            }

            call(options.startInputBarWatch);
            call(options.scheduleInputBarPositionUpdate, true);
        });

        input.addEventListener('blur', () => {
            if (!call(options.isInputActive)) return;
            doBlurCleanup();
        });

        const isExpenseInputFocused = () => !!call(options.isInputActive) ||
            activeDocument.activeElement === input;

        const isInsideElement = (target, container) => {
            if (!target || !container) return false;
            if (target === container) return true;
            if (typeof container.contains === 'function' && container.contains(target)) return true;
            if (container === inputBar && typeof target.closest === 'function') {
                return !!target.closest('#input-bar');
            }
            return false;
        };

        const isFocusableFieldTarget = target => {
            if (!target) return false;
            if (typeof target.closest === 'function' && target.closest('input, textarea, select')) {
                return true;
            }
            const tagName = String(target.tagName || '').toUpperCase();
            return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
        };

        const shouldDismissForTarget = target => isExpenseInputFocused() &&
            !isInsideElement(target, inputBar) &&
            !isFocusableFieldTarget(target);

        const blurExpenseInput = () => {
            if (typeof input.blur === 'function') {
                try { input.blur(); } catch (_) { }
            }

            if (activeDocument.activeElement === input && setTimer) {
                setTimer(() => {
                    if (activeDocument.activeElement === input && typeof input.blur === 'function') {
                        try { input.blur(); } catch (_) { }
                    }
                }, 0);
            }
        };

        if (typeof activeDocument.addEventListener === 'function') {
            let outsideTouch = null;
            let lastInputBarInteractionTime = 0;
            let lastInputBarTouchTime = 0;
            let lastScrollDragTime = 0;

            activeDocument.addEventListener('touchstart', event => {
                lastScrollDragTime = 0;
                const target = event && event.target;
                if (isInsideElement(target, inputBar)) {
                    const now = Date.now();
                    lastInputBarInteractionTime = now;
                    lastInputBarTouchTime = now;
                    outsideTouch = null;
                    return;
                }

                lastInputBarInteractionTime = 0;
                lastInputBarTouchTime = 0;
                const touches = event && event.touches;
                const touch = touches && touches[0];
                if (!touch || (touches && touches.length > 1) || !shouldDismissForTarget(target)) {
                    outsideTouch = null;
                    return;
                }

                outsideTouch = {
                    x: Number(touch.clientX || 0),
                    y: Number(touch.clientY || 0),
                    moved: false,
                    target
                };
            }, { capture: true, passive: true });

            activeDocument.addEventListener('mousedown', event => {
                const target = event && event.target;
                const now = Date.now();
                if (isInsideElement(target, inputBar)) {
                    lastInputBarInteractionTime = now;
                    return;
                }

                if (lastInputBarTouchTime > 0 && now - lastInputBarTouchTime < INPUT_BAR_CLICK_SUPPRESS_MS) {
                    return;
                }

                lastInputBarInteractionTime = 0;
            }, { capture: true, passive: true });

            activeDocument.addEventListener('touchmove', event => {
                if (!outsideTouch) return;

                const touches = event && event.touches;
                const touch = touches && touches[0];
                if (!touch || (touches && touches.length > 1)) {
                    outsideTouch.moved = true;
                    return;
                }

                const moved = Math.hypot(
                    Number(touch.clientX || 0) - outsideTouch.x,
                    Number(touch.clientY || 0) - outsideTouch.y
                );
                if (moved > TAP_MOVE_LIMIT) {
                    outsideTouch.moved = true;
                }
            }, { capture: true, passive: true });

            activeDocument.addEventListener('touchcancel', () => {
                outsideTouch = null;
            }, { capture: true, passive: true });

            activeDocument.addEventListener('touchend', event => {
                if (!outsideTouch) return;

                const changed = event && event.changedTouches && event.changedTouches[0];
                const moved = outsideTouch.moved || (
                    !!changed &&
                    Math.hypot(
                        Number(changed.clientX || 0) - outsideTouch.x,
                        Number(changed.clientY || 0) - outsideTouch.y
                    ) > TAP_MOVE_LIMIT
                );
                const target = (event && event.target) || outsideTouch.target;
                outsideTouch = null;

                if (moved) {
                    lastScrollDragTime = Date.now();
                    return;
                }

                lastScrollDragTime = 0;
                if (!shouldDismissForTarget(target)) return;

                blurExpenseInput();
            }, { capture: true, passive: true });

            activeDocument.addEventListener('click', event => {
                const now = Date.now();
                if (lastInputBarInteractionTime > 0 && now - lastInputBarInteractionTime < INPUT_BAR_CLICK_SUPPRESS_MS) {
                    if (!isInsideElement(event && event.target, inputBar)) {
                        if (event && typeof event.preventDefault === 'function') event.preventDefault();
                        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
                    }
                    return;
                }
                if (lastScrollDragTime > 0 && now - lastScrollDragTime < SCROLL_CLICK_SUPPRESS_MS) {
                    return;
                }
                if (!shouldDismissForTarget(event && event.target)) return;
                blurExpenseInput();
            }, { capture: true, passive: false });
        }

        const SpeechRecognitionClass = options.SpeechRecognitionClass ||
            activeWindow.SpeechRecognition ||
            activeWindow.webkitSpeechRecognition;

        if (SpeechRecognitionClass) {
            recognition = new SpeechRecognitionClass();
            recognition.lang = 'it-IT';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = e => {
                input.value = e.results[0][0].transcript;
                btnVoice.classList.remove('recording');
                call(options.onSubmit);
            };

            recognition.onerror = () => {
                btnVoice.classList.remove('recording');
                call(options.onVoiceError);
            };

            recognition.onend = () => {
                btnVoice.classList.remove('recording');
            };

            const toggleVoice = () => {
                if (btnVoice.classList.contains('recording')) {
                    recognition.stop();
                } else {
                    btnVoice.classList.add('recording');
                    recognition.start();
                }
            };

            btnVoice.addEventListener('touchstart', () => {
                btnVoice.classList.add('pressed');
            }, { passive: true });

            btnVoice.addEventListener('touchend', e => {
                btnVoice.classList.remove('pressed');
                e.preventDefault();
                touchHandled = true;
                toggleVoice();
            });

            btnVoice.addEventListener('click', () => {
                if (touchHandled) {
                    touchHandled = false;
                    return;
                }

                toggleVoice();
            });
        } else {
            btnVoice.style.display = 'none';
        }

        call(options.initDevDiagnostics);

        return {
            input,
            btnSend,
            btnVoice,
            inputBar,
            recognition
        };
    }

    return {
        init
    };
})();
