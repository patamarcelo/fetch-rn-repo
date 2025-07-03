export function promiseWithTimeout(promise, ms) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout ' + ms + 'ms')), ms),
    );
    return Promise.race([promise, timeout]);
}