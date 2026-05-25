/* ============================================
   EXPENSE INPUT CONTROLLER - eventi input rapido
   ============================================ */

const ExpenseInputController = (() => {
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

            call(options.stopInputBarWatch, { deferReset: true });
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
