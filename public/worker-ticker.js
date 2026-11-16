// Web Worker for background precision ticking
// Prevents Google Chrome from throttling timers in inactive/background tabs

let timerId = null;

self.onmessage = function (e) {
  if (e.data === 'START') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage({ type: 'TICK', now: Date.now() });
    }, 1000);
  } else if (e.data === 'STOP') {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
};
