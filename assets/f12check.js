(function() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
            e.preventDefault();
            return false;
        }
    });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    const devtools = /./;
    devtools.toString = function() {
        return '';
    };
    console.log('%c', devtools);
})();

const TRAP = true;
let _timerInterval = null;
let _sizeInterval = null;

function installAntidebug(enabled) {
    if (!enabled)
        return;
    const timerTrap = () => {
        const start = performance.now();
        debugger;
    };
    _timerInterval = setInterval(timerTrap, 2000);
}

window.disableAntidebug = function() {
    if (_timerInterval) {
        clearInterval(_timerInterval);
        _timerInterval = null;
    }
    if (_sizeInterval) {
        clearInterval(_sizeInterval);
        _sizeInterval = null;
    }
};

window.enableAntidebug = function() {
    if (!_timerInterval && !_sizeInterval) {
        installAntidebug(true);
    }
};

installAntidebug(true);
