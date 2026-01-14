// timer-worker.js
// Este worker mantiene el tiempo preciso en segundo plano
let interval = null;

self.onmessage = function(e) {
    if (e.data === 'start') {
        if (!interval) {
            interval = setInterval(() => {
                self.postMessage('tick');
            }, 100); // Tick cada 100ms para precisión decente sin sobrecargar
        }
    } else if (e.data === 'stop') {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
    }
};
